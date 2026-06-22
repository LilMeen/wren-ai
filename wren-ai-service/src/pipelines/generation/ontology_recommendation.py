import logging
import sys
from enum import Enum
from typing import Any

import orjson
from hamilton import base
from hamilton.async_driver import AsyncDriver
from haystack.components.builders.prompt_builder import PromptBuilder
from langfuse.decorators import observe
from pydantic import BaseModel

from src.core.pipeline import BasicPipeline
from src.core.provider import LLMProvider
from src.pipelines.common import clean_up_new_lines
from src.utils import trace_cost

logger = logging.getLogger("wren-ai-service")


system_prompt = """
You are an expert in business semantic modeling and ontology design (similar to Microsoft Fabric IQ). Given a data model specification (MDL) that includes models, their columns, and physical relationships, your task is to produce a business-oriented ontology on top of the physical schema.

The ontology has two parts:

1. **entities** — one entity per model. Each entity represents a business concept (e.g. Customer, Order, Product). For each entity provide:
   - **name**: a concise business/semantic name in PascalCase (e.g. "Customer", "OrderLineItem").
   - **displayName**: a human-friendly label (may be localized).
   - **description**: what this concept means in business terms.
   - **sourceModel**: the exact model name from the MDL this entity maps to.
   - **attributes**: the meaningful business attributes of the entity. For each attribute provide **name** (business name), **sourceColumn** (the exact column name from the MDL model), and **description**. Only include attributes that map to real columns; skip technical/relationship columns.

2. **relationships** — semantic relationships between entities, expressed in business language. For each relationship provide:
   - **name**: a descriptive business phrase (e.g. "Customer places Order").
   - **fromEntity**: the source entity name (must match an entity "name").
   - **toEntity**: the target entity name (must match an entity "name").
   - **type**: one of "MANY_TO_ONE", "ONE_TO_MANY" or "ONE_TO_ONE" only.
   - **description**: the business meaning of the relationship.
   - **sourceRelation**: the physical relationship name from the MDL it derives from, if any (else empty string).

Important guidelines:
1. Create exactly one entity per model in the MDL.
2. Prefer deriving relationships from the physical relationships in the MDL, but you may also infer obvious business relationships.
3. Do not invent models, columns, or entities that are not present in the MDL.
4. fromEntity and toEntity must be different.
5. Use "MANY_TO_ONE" / "ONE_TO_MANY" instead of "MANY_TO_MANY".

Output strictly in the following JSON structure:

{
    "entities": [
        {
            "name": "<entity_name>",
            "displayName": "<display_name>",
            "description": "<description>",
            "sourceModel": "<model_name>",
            "attributes": [
                {
                    "name": "<attribute_name>",
                    "sourceColumn": "<column_name>",
                    "description": "<description>"
                }
            ]
        }
    ],
    "relationships": [
        {
            "name": "<relationship_name>",
            "fromEntity": "<entity_name>",
            "toEntity": "<entity_name>",
            "type": "<relationship_type>",
            "description": "<description>",
            "sourceRelation": "<physical_relation_name_or_empty>"
        }
    ]
}

If there are no models, return: {"entities": [], "relationships": []}
"""

user_prompt_template = """
Here is the data model (MDL) specification:

{{models}}

Physical relationships:

{{relationships}}

**Please analyze the schema and produce a business ontology (entities + semantic relationships).**
Generate the entity names, display names, descriptions, and relationship names/reasons in this localization language: {{language}}
"""


## Start of Pipeline
@observe(capture_input=False)
def cleaned_models(mdl: dict) -> dict:
    return mdl.get("models", [])


@observe(capture_input=False)
def cleaned_relationships(mdl: dict) -> list:
    return mdl.get("relationships", [])


@observe(capture_input=False)
def prompt(
    cleaned_models: dict,
    cleaned_relationships: list,
    prompt_builder: PromptBuilder,
    language: str,
) -> dict:
    _prompt = prompt_builder.run(
        models=cleaned_models,
        relationships=cleaned_relationships,
        language=language,
    )
    return {"prompt": clean_up_new_lines(_prompt.get("prompt"))}


@observe(as_type="generation", capture_input=False)
@trace_cost
async def generate(prompt: dict, generator: Any, generator_name: str) -> dict:
    return await generator(prompt=prompt.get("prompt")), generator_name


@observe(capture_input=False)
def normalized(generate: dict) -> dict:
    def wrapper(text: str) -> dict:
        text = text.replace("\n", " ")
        text = " ".join(text.split())
        try:
            return orjson.loads(text.strip())
        except orjson.JSONDecodeError as e:
            logger.error(f"Error decoding JSON: {e}")
            return {}

    reply = generate.get("replies")[0]  # Expecting only one reply
    return wrapper(reply)


@observe(capture_input=False)
def validated(normalized: dict, mdl: dict) -> dict:
    # map model name -> set of column names
    model_columns = {
        model["name"]: set(
            column["name"]
            for column in model.get("columns", [])
            if not column.get("relationship")
        )
        for model in mdl.get("models", [])
    }

    entities = normalized.get("entities", [])
    validated_entities = []
    for entity in entities:
        source_model = entity.get("sourceModel")
        if source_model not in model_columns:
            continue
        valid_columns = model_columns[source_model]
        attributes = [
            attribute
            for attribute in entity.get("attributes", [])
            if attribute.get("sourceColumn") in valid_columns
        ]
        validated_entities.append({**entity, "attributes": attributes})

    valid_entity_names = {entity["name"] for entity in validated_entities}

    relationships = normalized.get("relationships", [])
    validated_relationships = [
        relationship
        for relationship in relationships
        if RelationType.is_include(relationship.get("type"))
        and relationship.get("fromEntity") in valid_entity_names
        and relationship.get("toEntity") in valid_entity_names
        and relationship.get("fromEntity") != relationship.get("toEntity")
    ]

    return {
        "entities": validated_entities,
        "relationships": validated_relationships,
    }


## End of Pipeline
class RelationType(Enum):
    MANY_TO_ONE = "MANY_TO_ONE"
    ONE_TO_MANY = "ONE_TO_MANY"
    ONE_TO_ONE = "ONE_TO_ONE"

    @classmethod
    def is_include(cls, value: str) -> bool:
        return value in cls._value2member_map_


class OntologyAttribute(BaseModel):
    name: str
    sourceColumn: str
    description: str


class OntologyEntity(BaseModel):
    name: str
    displayName: str
    description: str
    sourceModel: str
    attributes: list[OntologyAttribute]


class OntologyRelationship(BaseModel):
    name: str
    fromEntity: str
    toEntity: str
    type: RelationType
    description: str
    sourceRelation: str


class OntologyResult(BaseModel):
    entities: list[OntologyEntity]
    relationships: list[OntologyRelationship]


ONTOLOGY_RECOMMENDATION_MODEL_KWARGS = {
    "response_format": {
        "type": "json_schema",
        "json_schema": {
            "name": "ontology_recommendation",
            "schema": OntologyResult.model_json_schema(),
        },
    }
}


class OntologyRecommendation(BasicPipeline):
    def __init__(
        self,
        llm_provider: LLMProvider,
        **_,
    ):
        self._components = {
            "prompt_builder": PromptBuilder(template=user_prompt_template),
            "generator": llm_provider.get_generator(
                system_prompt=system_prompt,
                generation_kwargs=ONTOLOGY_RECOMMENDATION_MODEL_KWARGS,
            ),
            "generator_name": llm_provider.get_model(),
        }

        self._final = "validated"

        super().__init__(
            AsyncDriver({}, sys.modules[__name__], result_builder=base.DictResult())
        )

    @observe(name="Ontology Recommendation")
    async def run(
        self,
        mdl: dict,
        language: str = "English",
    ) -> dict:
        logger.info("Ontology Recommendation pipeline is running...")
        return await self._pipe.execute(
            [self._final],
            inputs={
                "mdl": mdl,
                "language": language,
                **self._components,
            },
        )
