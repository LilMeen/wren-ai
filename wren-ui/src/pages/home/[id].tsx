import { useRouter } from 'next/router';
import { useParams } from 'next/navigation';
import {
  ComponentRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { isEmpty } from 'lodash';
import { message } from 'antd';
import { Path } from '@/utils/enum';
import useHomeSidebar from '@/hooks/useHomeSidebar';
import SiderLayout from '@/components/layouts/SiderLayout';
import Prompt from '@/components/pages/home/prompt';
import useAskPrompt, {
  getIsFinished,
  canFetchThreadResponse,
  isRecommendedFinished,
} from '@/hooks/useAskPrompt';
import useAdjustAnswer from '@/hooks/useAdjustAnswer';
import useModalAction from '@/hooks/useModalAction';
import PromptThread from '@/components/pages/home/promptThread';
import SaveAsViewModal from '@/components/modals/SaveAsViewModal';
import QuestionSQLPairModal from '@/components/modals/QuestionSQLPairModal';
import AdjustReasoningStepsModal from '@/components/modals/AdjustReasoningStepsModal';
import AdjustSQLModal from '@/components/modals/AdjustSQLModal';
import { getAnswerIsFinished } from '@/components/pages/home/promptThread/TextBasedAnswer';
import { getIsChartFinished } from '@/components/pages/home/promptThread/ChartAnswer';
import { PromptThreadProvider } from '@/components/pages/home/promptThread/store';
import {
  useCreateThreadResponseMutation,
  useThreadQuery,
  useThreadResponseLazyQuery,
  useUpdateThreadResponseMutation,
  useGenerateThreadRecommendationQuestionsMutation,
  useGetThreadRecommendationQuestionsLazyQuery,
  useGenerateThreadResponseAnswerMutation,
  useGenerateThreadResponseChartMutation,
  useAdjustThreadResponseChartMutation,
} from '@/apollo/client/graphql/home.generated';
import { useCreateViewMutation } from '@/apollo/client/graphql/view.generated';
import {
  AdjustThreadResponseChartInput,
  AskingTaskStatus,
  CreateThreadResponseInput,
  ThreadResponse,
  CreateSqlPairInput,
} from '@/apollo/client/graphql/__types__';

// Asking-task failures that are commonly transient — e.g. retrieval coming up
// empty right after a deploy while the vector index is still settling. We
// auto-retry these once so a transient miss doesn't strand the user on a dead
// "Try a different query" response that would have succeeded a moment later.
const TRANSIENT_ASKING_ERROR_CODES = ['NO_RELEVANT_DATA', 'NO_RELEVANT_SQL'];
import { useCreateSqlPairMutation } from '@/apollo/client/graphql/sqlPairs.generated';

const getThreadResponseIsFinished = (threadResponse: ThreadResponse) => {
  const { answerDetail, breakdownDetail, chartDetail } = threadResponse || {};
  // it means it's the old data before support text based answer
  const isBreakdownOnly = answerDetail === null && !isEmpty(breakdownDetail);

  // false make it keep polling when the text based answer is default needed.
  let isAnswerFinished = isBreakdownOnly ? null : false;
  let isChartFinished = null;

  // answerDetail status can be FAILED before getting queryId from Wren AI adapter
  if (answerDetail?.queryId || answerDetail?.status) {
    isAnswerFinished = getAnswerIsFinished(answerDetail?.status);
  }

  if (chartDetail?.queryId) {
    isChartFinished = getIsChartFinished(chartDetail?.status);
  }
  // if equal false, it means it has task & the task is not finished
  return isAnswerFinished !== false && isChartFinished !== false;
};

export default function HomeThread() {
  const $prompt = useRef<ComponentRef<typeof Prompt>>(null);
  const router = useRouter();
  const params = useParams();
  const homeSidebar = useHomeSidebar();
  const threadId = useMemo(() => Number(params?.id) || null, [params]);
  const askPrompt = useAskPrompt(threadId);
  const adjustAnswer = useAdjustAnswer(threadId);
  const saveAsViewModal = useModalAction();
  const questionSqlPairModal = useModalAction();
  const adjustReasoningStepsModal = useModalAction();
  const adjustSqlModal = useModalAction();

  const [showRecommendedQuestions, setShowRecommendedQuestions] =
    useState<boolean>(false);

  // Track responses we've already auto-retried so a persistently failing
  // question is attempted at most once more, never looped.
  const autoRetriedResponseIds = useRef<Set<number>>(new Set());

  const [createViewMutation, { loading: creating }] = useCreateViewMutation({
    onError: (error) => console.error(error),
    onCompleted: () => message.success('Successfully created view.'),
  });

  const { data, updateQuery: updateThreadQuery } = useThreadQuery({
    variables: { threadId },
    fetchPolicy: 'cache-and-network',
    skip: threadId === null,
    onError: () => router.push(Path.Home),
  });
  const [createThreadResponse] = useCreateThreadResponseMutation({
    onError: (error) => console.error(error),
    onCompleted(next) {
      const nextResponse = next.createThreadResponse;
      updateThreadQuery((prev) => {
        return {
          ...prev,
          thread: {
            ...prev.thread,
            responses: [...prev.thread.responses, nextResponse],
          },
        };
      });
    },
  });
  const [updateThreadResponse, { loading: threadResponseUpdating }] =
    useUpdateThreadResponseMutation({
      onError: (error) => console.error(error),
      onCompleted: (data) => {
        message.success('Successfully updated the SQL statement');
        // trigger generate answer after sql statement updated
        onGenerateThreadResponseAnswer(data.updateThreadResponse.id);
      },
    });
  const [fetchThreadResponse, threadResponseResult] =
    useThreadResponseLazyQuery({
      pollInterval: 1000,
      onCompleted(next) {
        const nextResponse = next.threadResponse;
        updateThreadQuery((prev) => ({
          ...prev,
          thread: {
            ...prev.thread,
            responses: prev.thread.responses.map((response) =>
              response.id === nextResponse.id ? nextResponse : response,
            ),
          },
        }));
      },
    });

  const [generateThreadRecommendationQuestions] =
    useGenerateThreadRecommendationQuestionsMutation({
      onError: (error) => console.error(error),
    });

  const [
    fetchThreadRecommendationQuestions,
    threadRecommendationQuestionsResult,
  ] = useGetThreadRecommendationQuestionsLazyQuery({
    pollInterval: 1000,
  });

  const [generateThreadResponseAnswer] =
    useGenerateThreadResponseAnswerMutation({
      onError: (error) => console.error(error),
    });

  const [generateThreadResponseChart] = useGenerateThreadResponseChartMutation({
    onError: (error) => console.error(error),
  });
  const [adjustThreadResponseChart] = useAdjustThreadResponseChartMutation({
    onError: (error) => console.error(error),
  });

  const [createSqlPairMutation, { loading: createSqlPairLoading }] =
    useCreateSqlPairMutation({
      refetchQueries: ['SqlPairs'],
      awaitRefetchQueries: true,
      onError: (error) => console.error(error),
      onCompleted: () => {
        message.success('Successfully created question-sql pair.');
      },
    });

  const thread = useMemo(() => data?.thread || null, [data]);
  const responses = useMemo(() => thread?.responses || [], [thread]);
  const pollingResponse = useMemo(
    () => threadResponseResult.data?.threadResponse || null,
    [threadResponseResult.data],
  );
  const isPollingResponseFinished = useMemo(
    () => getThreadResponseIsFinished(pollingResponse),
    [pollingResponse],
  );

  const onFixSQLStatement = async (responseId: number, sql: string) => {
    await updateThreadResponse({
      variables: { where: { id: responseId }, data: { sql } },
    });
  };

  const onGenerateThreadResponseAnswer = async (responseId: number) => {
    await generateThreadResponseAnswer({ variables: { responseId } });
    fetchThreadResponse({ variables: { responseId } });
  };

  const onGenerateThreadResponseChart = async (responseId: number) => {
    await generateThreadResponseChart({ variables: { responseId } });
    fetchThreadResponse({ variables: { responseId } });
  };

  const onAdjustThreadResponseChart = async (
    responseId: number,
    data: AdjustThreadResponseChartInput,
  ) => {
    await adjustThreadResponseChart({
      variables: { responseId, data },
    });
    fetchThreadResponse({ variables: { responseId } });
  };

  const onGenerateThreadRecommendedQuestions = async () => {
    await generateThreadRecommendationQuestions({ variables: { threadId } });
    fetchThreadRecommendationQuestions({ variables: { threadId } });
  };

  const handleUnfinishedTasks = useCallback(
    (responses: ThreadResponse[]) => {
      // unfinished asking task
      const unfinishedAskingResponse = (responses || []).find(
        (response) =>
          response?.askingTask && !getIsFinished(response?.askingTask?.status),
      );
      if (unfinishedAskingResponse) {
        askPrompt.onFetching(unfinishedAskingResponse?.askingTask?.queryId);
        return;
      }

      // unfinished thread response
      const unfinishedThreadResponse = (responses || []).find(
        (response) => !getThreadResponseIsFinished(response),
      );

      if (
        canFetchThreadResponse(unfinishedThreadResponse?.askingTask) &&
        unfinishedThreadResponse
      ) {
        fetchThreadResponse({
          variables: { responseId: unfinishedThreadResponse.id },
        });
      }
    },
    [askPrompt, fetchThreadResponse],
  );

  // auto-retry the latest response once if its asking task failed transiently
  const handleTransientAskingFailures = useCallback(
    (responses: ThreadResponse[]) => {
      const lastResponse = (responses || [])[responses.length - 1];
      const task = lastResponse?.askingTask;
      if (
        task?.status === AskingTaskStatus.FAILED &&
        TRANSIENT_ASKING_ERROR_CODES.includes(task?.error?.code || '') &&
        !autoRetriedResponseIds.current.has(lastResponse.id)
      ) {
        autoRetriedResponseIds.current.add(lastResponse.id);
        askPrompt.onReRun(lastResponse);
      }
    },
    [askPrompt],
  );

  // store thread questions for instant recommended questions
  const storeQuestionsToAskPrompt = useCallback(
    (responses: ThreadResponse[]) => {
      const questions = responses.flatMap((res) => res.question || []);
      if (questions) askPrompt.onStoreThreadQuestions(questions);
    },
    [askPrompt],
  );

  // stop all requests when change thread
  useEffect(() => {
    if (threadId !== null) {
      fetchThreadRecommendationQuestions({ variables: { threadId } });
      setShowRecommendedQuestions(true);
    }
    return () => {
      askPrompt.onStopPolling();
      threadResponseResult.stopPolling();
      threadRecommendationQuestionsResult.stopPolling();
      $prompt.current?.close();
    };
  }, [threadId]);

  // initialize asking task
  useEffect(() => {
    if (!responses) return;
    handleUnfinishedTasks(responses);
    handleTransientAskingFailures(responses);
    storeQuestionsToAskPrompt(responses);
  }, [responses]);

  useEffect(() => {
    if (isPollingResponseFinished) {
      threadResponseResult.stopPolling();
      setShowRecommendedQuestions(true);
    }
  }, [isPollingResponseFinished]);

  const recommendedQuestions = useMemo(
    () =>
      threadRecommendationQuestionsResult.data
        ?.getThreadRecommendationQuestions || null,
    [threadRecommendationQuestionsResult.data],
  );

  useEffect(() => {
    if (isRecommendedFinished(recommendedQuestions?.status)) {
      threadRecommendationQuestionsResult.stopPolling();
    }
  }, [recommendedQuestions]);

  const onCreateResponse = async (payload: CreateThreadResponseInput) => {
    try {
      askPrompt.onStopPolling();

      const threadId = thread.id;
      await createThreadResponse({
        variables: { threadId, data: payload },
      });
      setShowRecommendedQuestions(false);
    } catch (error) {
      console.error(error);
    }
  };

  const providerValue = {
    data: thread,
    recommendedQuestions,
    showRecommendedQuestions,
    preparation: {
      askingStreamTask: askPrompt.data?.askingStreamTask,
      onStopAskingTask: askPrompt.onStop,
      onReRunAskingTask: askPrompt.onReRun,
      onStopAdjustTask: adjustAnswer.onStop,
      onReRunAdjustTask: adjustAnswer.onReRun,
      onFixSQLStatement,
      fixStatementLoading: threadResponseUpdating,
    },
    onOpenSaveAsViewModal: saveAsViewModal.openModal,
    onSelectRecommendedQuestion: onCreateResponse,
    onGenerateThreadRecommendedQuestions: onGenerateThreadRecommendedQuestions,
    onGenerateTextBasedAnswer: onGenerateThreadResponseAnswer,
    onGenerateChartAnswer: onGenerateThreadResponseChart,
    onAdjustChartAnswer: onAdjustThreadResponseChart,
    onOpenSaveToKnowledgeModal: questionSqlPairModal.openModal,
    onOpenAdjustReasoningStepsModal: adjustReasoningStepsModal.openModal,
    onOpenAdjustSQLModal: adjustSqlModal.openModal,
  };

  return (
    <SiderLayout loading={false} sidebar={homeSidebar}>
      <PromptThreadProvider value={providerValue}>
        <PromptThread />
      </PromptThreadProvider>

      <div className="py-12" />
      <Prompt
        ref={$prompt}
        {...askPrompt}
        onCreateResponse={onCreateResponse}
      />
      <SaveAsViewModal
        {...saveAsViewModal.state}
        loading={creating}
        onClose={saveAsViewModal.closeModal}
        onSubmit={async (values) => {
          await createViewMutation({
            variables: { data: values },
          });
        }}
      />
      <QuestionSQLPairModal
        {...questionSqlPairModal.state}
        onClose={questionSqlPairModal.closeModal}
        loading={createSqlPairLoading}
        onSubmit={async ({ data }: { data: CreateSqlPairInput }) => {
          await createSqlPairMutation({ variables: { data } });
        }}
      />

      <AdjustReasoningStepsModal
        {...adjustReasoningStepsModal.state}
        onClose={adjustReasoningStepsModal.closeModal}
        loading={adjustAnswer.loading}
        onSubmit={async (values) => {
          await adjustAnswer.onAdjustReasoningSteps(
            values.responseId,
            values.data,
          );
        }}
      />

      <AdjustSQLModal
        {...adjustSqlModal.state}
        onClose={adjustSqlModal.closeModal}
        loading={adjustAnswer.loading}
        onSubmit={async (values) =>
          await adjustAnswer.onAdjustSQL(values.responseId, values.sql)
        }
      />
    </SiderLayout>
  );
}
