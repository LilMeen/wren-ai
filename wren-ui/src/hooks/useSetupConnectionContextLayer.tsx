import { useRouter } from 'next/router';
import { useCallback, useRef } from 'react';
import { useMutation } from '@apollo/client';
import { Path } from '@/utils/enum';
import { useSaveDataSourceMutation } from '@/apollo/client/graphql/dataSource.generated';
import { DataSourceName } from '@/apollo/client/graphql/__types__';
import {
  SAVE_OPEN_METADATA_CONFIG,
  IMPORT_OPEN_METADATA_GLOSSARY,
} from '@/apollo/client/graphql/openMetadata';
import { transformFormToProperties } from './useSetupConnectionDataSource';

export interface ContextLayerStepData {
  omServiceName: string;
  omGlossaryNames: string[];
  properties: Record<string, any>;
  dataSourceType: DataSourceName;
}

export default function useSetupConnectionContextLayer() {
  const router = useRouter();

  // Stash the full payload between saveDataSource mutation call and its
  // onCompleted callback (the callback closure captures a stale ref).
  const pendingRef = useRef<ContextLayerStepData | null>(null);

  const [saveOpenMetadataConfig] = useMutation(SAVE_OPEN_METADATA_CONFIG);
  const [importOpenMetadataGlossary] = useMutation(
    IMPORT_OPEN_METADATA_GLOSSARY,
  );

  const [saveDataSourceMutation, { loading, error }] =
    useSaveDataSourceMutation({
      onError: (err) => console.error(err),
      onCompleted: () => onSaveCompleted(),
    });

  const onSaveCompleted = useCallback(async () => {
    const pending = pendingRef.current;
    if (!pending) return;

    // Persist OM config so metadataService.listTables() enriches descriptions
    // when the next wizard step (SelectModels) calls listDataSourceTables.
    try {
      await saveOpenMetadataConfig({
        variables: {
          data: { serviceName: pending.omServiceName, enabled: true },
        },
      });
    } catch (e) {
      console.warn('Failed to save OpenMetadata config:', e);
    }

    // Import selected glossary terms as Instructions (best-effort).
    if (pending.omGlossaryNames?.length) {
      try {
        await importOpenMetadataGlossary({
          variables: { glossaryNames: pending.omGlossaryNames },
        });
      } catch (e) {
        console.warn('Failed to import OpenMetadata glossary:', e);
      }
    }

    router.push(Path.OnboardingModels);
  }, [router, saveOpenMetadataConfig, importOpenMetadataGlossary]);

  const saveContextLayer = useCallback(
    async (data: ContextLayerStepData) => {
      pendingRef.current = data;
      await saveDataSourceMutation({
        variables: {
          data: {
            type: data.dataSourceType,
            properties: transformFormToProperties(
              data.properties,
              data.dataSourceType as any,
            ),
          },
        },
      });
    },
    [saveDataSourceMutation],
  );

  return { loading, error, saveContextLayer };
}
