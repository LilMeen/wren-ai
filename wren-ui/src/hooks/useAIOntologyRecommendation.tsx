import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useLazyQuery } from '@apollo/client';
import {
  GENERATE_ONTOLOGY_RECOMMENDATIONS,
  GET_ONTOLOGY_RECOMMENDATION_TASK,
} from '@/apollo/client/graphql/ontology';

const POLL_INTERVAL_MS = 2000;

export interface OntologyAttribute {
  name: string;
  sourceColumn: string;
  description?: string;
}

export interface OntologyEntity {
  id?: string;
  name: string;
  displayName?: string;
  description?: string;
  sourceModel: string;
  attributes?: OntologyAttribute[];
}

export interface OntologyRelationship {
  id?: string;
  name: string;
  fromEntity: string;
  toEntity: string;
  type: string;
  description?: string;
  sourceRelation?: string;
}

export interface OntologyGraph {
  entities: OntologyEntity[];
  relationships: OntologyRelationship[];
}

export default function useAIOntologyRecommendation(
  onResult: (definition: OntologyGraph) => void,
) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const taskIdRef = useRef<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [generateMutation] = useMutation(GENERATE_ONTOLOGY_RECOMMENDATIONS);
  const [pollTask] = useLazyQuery(GET_ONTOLOGY_RECOMMENDATION_TASK, {
    fetchPolicy: 'no-cache',
  });

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const poll = useCallback(
    async (taskId: string) => {
      try {
        const { data } = await pollTask({ variables: { taskId } });
        const task = data?.ontologyRecommendationTask;

        if (!task) return;

        if (task.status === 'generating') {
          pollTimerRef.current = setTimeout(
            () => poll(taskId),
            POLL_INTERVAL_MS,
          );
          return;
        }

        setGenerating(false);

        if (task.status === 'failed') {
          setError(task.error?.message || 'AI generation failed.');
          return;
        }

        if (task.status === 'finished' && task.definition) {
          onResult({
            entities: task.definition.entities || [],
            relationships: task.definition.relationships || [],
          });
        }
      } catch (err: any) {
        setGenerating(false);
        setError(err?.message || 'Failed to get AI recommendation result.');
      }
    },
    [pollTask, onResult],
  );

  const generate = useCallback(async () => {
    setError(null);
    setElapsed(0);
    setGenerating(true);
    try {
      const { data } = await generateMutation();
      const taskId = data?.generateOntologyRecommendations?.id;
      if (!taskId) throw new Error('No task ID returned from AI service.');
      taskIdRef.current = taskId;
      pollTimerRef.current = setTimeout(() => poll(taskId), POLL_INTERVAL_MS);
    } catch (err: any) {
      setGenerating(false);
      setError(err?.message || 'Failed to start AI recommendation.');
    }
  }, [generateMutation, poll]);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  // tick the elapsed-seconds counter while generating
  useEffect(() => {
    if (!generating) return;
    const timer = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [generating]);

  return { generating, error, elapsed, generate };
}
