import { useMemo } from 'react';
import SimpleLayout from '@/components/layouts/SimpleLayout';
import ContainerCard from '@/components/pages/setup/ContainerCard';
import useSetupOntology from '@/hooks/useSetupOntology';
import { SETUP_STEPS } from '@/components/pages/setup/utils';

export default function SetupOntology() {
  const {
    fetching,
    stepKey,
    initialDefinition,
    onNext,
    onBack,
    onSkip,
    submitting,
  } = useSetupOntology();

  const current = useMemo(() => SETUP_STEPS[stepKey], [stepKey]);

  return (
    <SimpleLayout>
      <ContainerCard step={current.step} maxWidth={current.maxWidth}>
        <current.component
          fetching={fetching}
          initialDefinition={initialDefinition}
          onNext={onNext}
          onBack={onBack}
          onSkip={onSkip}
          submitting={submitting}
        />
      </ContainerCard>
    </SimpleLayout>
  );
}
