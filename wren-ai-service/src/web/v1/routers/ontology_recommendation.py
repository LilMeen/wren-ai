import uuid
from dataclasses import asdict
from typing import Literal, Optional

from fastapi import APIRouter, BackgroundTasks, Depends
from pydantic import BaseModel

from src.globals import (
    ServiceContainer,
    ServiceMetadata,
    get_service_container,
    get_service_metadata,
)
from src.web.v1.services import BaseRequest, OntologyRecommendation

router = APIRouter()


class PostRequest(BaseRequest):
    mdl: str


class PostResponse(BaseModel):
    id: str


@router.post(
    "/ontology-recommendations",
    response_model=PostResponse,
)
async def recommend(
    request: PostRequest,
    background_tasks: BackgroundTasks,
    service_container: ServiceContainer = Depends(get_service_container),
    service_metadata: ServiceMetadata = Depends(get_service_metadata),
) -> PostResponse:
    id = str(uuid.uuid4())
    service = service_container.ontology_recommendation

    service[id] = OntologyRecommendation.Resource(id=id)
    input = OntologyRecommendation.Input(
        id=id,
        mdl=request.mdl,
        project_id=request.project_id,
        configuration=request.configurations,
    )

    background_tasks.add_task(
        service.recommend, input, service_metadata=asdict(service_metadata)
    )

    return PostResponse(id=id)


class GetResponse(BaseModel):
    id: str
    status: Literal["generating", "finished", "failed"]
    response: Optional[dict]
    error: Optional[dict]
    trace_id: Optional[str] = None


@router.get(
    "/ontology-recommendations/{id}",
    response_model=GetResponse,
)
async def get(
    id: str,
    service_container: ServiceContainer = Depends(get_service_container),
) -> GetResponse:
    resource = service_container.ontology_recommendation[id]

    return GetResponse(
        id=resource.id,
        status=resource.status,
        response=resource.response,
        error=resource.error and resource.error.model_dump(),
        trace_id=resource.trace_id,
    )
