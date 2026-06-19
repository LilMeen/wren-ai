import { useState, useEffect } from 'react';
import { SETUP } from '@/utils/enum';
import { parseGraphQLError } from '@/utils/errorHandler';
import useSetupConnectionDataSource from './useSetupConnectionDataSource';
import useSetupConnectionSampleDataset from './useSetupConnectionSampleDataset';
import useSetupConnectionContextLayer, {
  ContextLayerStepData,
} from './useSetupConnectionContextLayer';
import {
  DataSourceName,
  SampleDatasetName,
} from '@/apollo/client/graphql/__types__';

type StepData = {
  dataSource?: DataSourceName;
  template?: SampleDatasetName;
  properties?: JSON;
  contextLayer?: boolean;
};

export default function useSetupConnection() {
  const [stepKey, setStepKey] = useState(SETUP.STARTER);
  const setupConnectionSampleDataset = useSetupConnectionSampleDataset();
  const setupConnectionDataSource = useSetupConnectionDataSource();
  const setupConnectionContextLayer = useSetupConnectionContextLayer();
  const [connectError, setConnectError] = useState(null);

  const dataSource = setupConnectionDataSource.selected;
  const submitting =
    setupConnectionDataSource.loading ||
    setupConnectionSampleDataset.loading ||
    setupConnectionContextLayer.loading;

  useEffect(() => {
    if (
      stepKey === SETUP.CREATE_DATA_SOURCE ||
      stepKey === SETUP.CONNECT_CONTEXT_LAYER
    ) {
      setConnectError(null);
    }
  }, [stepKey]);

  useEffect(() => {
    setConnectError(parseGraphQLError(setupConnectionDataSource.error));
  }, [setupConnectionDataSource.error]);

  useEffect(() => {
    if (setupConnectionContextLayer.error) {
      setConnectError(parseGraphQLError(setupConnectionContextLayer.error));
    }
  }, [setupConnectionContextLayer.error]);

  const onBack = () => {
    if (stepKey === SETUP.CREATE_DATA_SOURCE) {
      setStepKey(SETUP.STARTER);
      setupConnectionDataSource.reset();
    } else if (stepKey === SETUP.CONNECT_CONTEXT_LAYER) {
      setStepKey(SETUP.STARTER);
    }
  };

  const onNext = (data?: StepData) => {
    const dispatchStarter = (data: StepData) => {
      if (data.contextLayer) {
        setStepKey(SETUP.CONNECT_CONTEXT_LAYER);
      } else if (data.dataSource) {
        setupConnectionDataSource.selectDataSourceNext({
          dataSource: data.dataSource,
          dispatch: () => setStepKey(SETUP.CREATE_DATA_SOURCE),
        });
      } else {
        setupConnectionSampleDataset.saveSampleDataset(data.template);
      }
    };

    const dispatchCreateDataSource = (data: StepData) => {
      setupConnectionDataSource.saveDataSource(data.properties);
    };

    const dispatchConnectContextLayer = (data: StepData) => {
      setupConnectionContextLayer.saveContextLayer(
        data as unknown as ContextLayerStepData,
      );
    };

    // Next strategy
    if (stepKey === SETUP.STARTER) {
      dispatchStarter(data);
    } else if (stepKey === SETUP.CREATE_DATA_SOURCE) {
      dispatchCreateDataSource(data);
    } else if (stepKey === SETUP.CONNECT_CONTEXT_LAYER) {
      dispatchConnectContextLayer(data);
    }
  };

  return {
    stepKey,
    dataSource,
    onBack,
    onNext,
    submitting,
    connectError,
  };
}
