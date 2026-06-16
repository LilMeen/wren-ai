import { IWrenAIAdaptor } from '../adaptors';
import {
  WrenAILanguage,
  TextBasedAnswerResult,
  TextBasedAnswerStatus,
} from '../models/adaptor';
import {
  ThreadResponse,
  IThreadResponseRepository,
  IThreadRepository,
} from '../repositories';
import {
  IProjectService,
  IDeployService,
  IQueryService,
  ThreadResponseAnswerStatus,
  PreviewDataResponse,
} from '../services';
import { getLogger } from '@server/utils';

const logger = getLogger('TextBasedAnswerBackgroundTracker');
logger.level = 'debug';

export class TextBasedAnswerBackgroundTracker {
  // tasks is a kv pair of task id and thread response
  private tasks: Record<number, ThreadResponse> = {};
  private intervalTime: number;
  private wrenAIAdaptor: IWrenAIAdaptor;
  private threadResponseRepository: IThreadResponseRepository;
  private threadRepository: IThreadRepository;
  private projectService: IProjectService;
  private deployService: IDeployService;
  private queryService: IQueryService;
  private runningJobs = new Set();

  constructor({
    wrenAIAdaptor,
    threadResponseRepository,
    threadRepository,
    projectService,
    deployService,
    queryService,
  }: {
    wrenAIAdaptor: IWrenAIAdaptor;
    threadResponseRepository: IThreadResponseRepository;
    threadRepository: IThreadRepository;
    projectService: IProjectService;
    deployService: IDeployService;
    queryService: IQueryService;
  }) {
    this.wrenAIAdaptor = wrenAIAdaptor;
    this.threadResponseRepository = threadResponseRepository;
    this.threadRepository = threadRepository;
    this.projectService = projectService;
    this.deployService = deployService;
    this.queryService = queryService;
    this.intervalTime = 1000;
    this.start();
  }

  private start() {
    setInterval(async () => {
      const jobs = Object.values(this.tasks).map(
        (threadResponse) => async () => {
          if (
            this.runningJobs.has(threadResponse.id) ||
            !threadResponse.answerDetail
          ) {
            return;
          }
          this.runningJobs.add(threadResponse.id);

          // Without a SQL statement there is nothing to query. Sending a null
          // SQL to the ibis server returns a 422 and used to surface as a
          // confusing "Data connection error". Fail fast with a clear message
          // instead of querying with an invalid SQL.
          if (!threadResponse.sql) {
            logger.warn(
              `Thread response ${threadResponse.id} has no SQL, skipping answer generation`,
            );
            await this.threadResponseRepository.updateOne(threadResponse.id, {
              answerDetail: {
                ...threadResponse.answerDetail,
                status: ThreadResponseAnswerStatus.FAILED,
                error: {
                  code: 'NO_RELEVANT_SQL',
                  message: 'No SQL is available to answer this question.',
                  shortMessage: 'No relevant SQL',
                },
              },
            });
            delete this.tasks[threadResponse.id];
            this.runningJobs.delete(threadResponse.id);
            return;
          }

          // update the status to fetching data
          await this.threadResponseRepository.updateOne(threadResponse.id, {
            answerDetail: {
              ...threadResponse.answerDetail,
              status: ThreadResponseAnswerStatus.FETCHING_DATA,
            },
          });

          // get sql data — resolve the project that OWNS this thread response.
          // This runs outside the request's auth context (setInterval), so
          // getCurrentProject() would fall back to the first project and run
          // this SQL against the wrong project's MDL/connection. Resolve the
          // project from the thread instead.
          const thread = await this.threadRepository.findOneBy({
            id: threadResponse.threadId,
          });
          if (!thread) {
            throw new Error(
              `Thread ${threadResponse.threadId} not found for thread response ${threadResponse.id}`,
            );
          }
          const project = await this.projectService.getProjectById(
            thread.projectId,
          );
          const deployment = await this.deployService.getLastDeployment(
            project.id,
          );
          const mdl = deployment.manifest;
          let data: PreviewDataResponse;
          try {
            data = (await this.queryService.preview(threadResponse.sql, {
              project,
              manifest: mdl,
              modelingOnly: false,
              limit: 500,
            })) as PreviewDataResponse;
          } catch (error) {
            logger.error(`Error when query sql data: ${error}`);
            await this.threadResponseRepository.updateOne(threadResponse.id, {
              answerDetail: {
                ...threadResponse.answerDetail,
                status: ThreadResponseAnswerStatus.FAILED,
                error: error?.extensions || error,
              },
            });
            throw error;
          }

          // request AI service
          const response = await this.wrenAIAdaptor.createTextBasedAnswer({
            query: threadResponse.question,
            sql: threadResponse.sql,
            sqlData: data,
            threadId: threadResponse.threadId.toString(),
            configurations: {
              language: WrenAILanguage[project.language] || WrenAILanguage.EN,
            },
          });

          // update the status to preprocessing
          await this.threadResponseRepository.updateOne(threadResponse.id, {
            answerDetail: {
              ...threadResponse.answerDetail,
              status: ThreadResponseAnswerStatus.PREPROCESSING,
            },
          });

          // polling query id to check the status
          let result: TextBasedAnswerResult;
          do {
            result = await this.wrenAIAdaptor.getTextBasedAnswerResult(
              response.queryId,
            );
            if (result.status === TextBasedAnswerStatus.PREPROCESSING) {
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
          } while (result.status === TextBasedAnswerStatus.PREPROCESSING);

          // update the status to final
          const updatedAnswerDetail = {
            queryId: response.queryId,
            status:
              result.status === TextBasedAnswerStatus.SUCCEEDED
                ? ThreadResponseAnswerStatus.STREAMING
                : ThreadResponseAnswerStatus.FAILED,
            numRowsUsedInLLM: result.numRowsUsedInLLM,
            error: result.error,
          };
          await this.threadResponseRepository.updateOne(threadResponse.id, {
            answerDetail: updatedAnswerDetail,
          });

          delete this.tasks[threadResponse.id];

          // Mark the job as finished
          this.runningJobs.delete(threadResponse.id);
        },
      );

      // Run the jobs
      Promise.allSettled(jobs.map((job) => job())).then((results) => {
        // Show reason of rejection
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            logger.error(`Job ${index} failed: ${result.reason}`);
          }
        });
      });
    }, this.intervalTime);
  }

  public addTask(threadResponse: ThreadResponse) {
    this.tasks[threadResponse.id] = threadResponse;
  }

  public getTasks() {
    return this.tasks;
  }
}
