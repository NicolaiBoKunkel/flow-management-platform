describe('Flow editor', () => {
  it('E2E-003 opens a flow editor, edits node content, and saves the graph', () => {
    const email = `editor-${Date.now()}@test.com`;
    const password = 'test123456';
    const flowTitle = `Cypress Editor Flow ${Date.now()}`;

    const validGraph = {
      nodes: [
        {
          id: 'start-node',
          type: 'start',
          label: 'Start',
          position: { x: 0, y: 0 },
        },
        {
          id: 'question-node',
          type: 'question',
          label: 'Question',
          questionType: 'singleChoice',
          position: { x: 250, y: 120 },
        },
        {
          id: 'end-node',
          type: 'end',
          label: 'End',
          position: { x: 500, y: 240 },
        },
      ],
      edges: [
        {
          id: 'edge-start-question',
          source: 'start-node',
          target: 'question-node',
        },
        {
          id: 'edge-question-end',
          source: 'question-node',
          target: 'end-node',
        },
      ],
    };

    cy.registerUserApi(email, password).then((accessToken) => {
      cy.createFlowApi(accessToken, {
        title: flowTitle,
        description: 'Testing flow editor',
      }).then((flowId) => {
        cy.saveGraphApi(accessToken, flowId, validGraph);

        cy.loginViaUi(email, password);
        cy.visit(`/flows/${flowId}`);

        cy.contains(flowTitle).should('exist');
        cy.get('[data-cy="flow-canvas"]').should('exist');

        cy.contains('.react-flow__node', 'Question').click();

        cy.get('[data-cy="node-label-input"]')
          .clear()
          .type('Updated Question Node');

        cy.get('[data-cy="question-text-input"]')
          .clear()
          .type('How old are you?');

        cy.get('[data-cy="update-node-content"]').click();
        cy.get('[data-cy="save-flow-graph"]').click();

        cy.get('[data-cy="flow-editor-success-message"]').should(
          'contain',
          'Flow graph gemt',
        );
      });
    });
  });

  it('E2E-007 exports and imports a flow', () => {
    const email = `import-export-${Date.now()}@test.com`;
    const password = 'test123456';
    const flowTitle = `Import Export Flow ${Date.now()}`;

    const exportFileName = `${flowTitle
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')}.json`;

    const validGraph = {
      nodes: [
        {
          id: 'start-node',
          type: 'start',
          label: 'Start',
          introText: 'Imported/exported start text.',
          position: { x: 0, y: 0 },
        },
        {
          id: 'question-node',
          type: 'question',
          label: 'Question',
          questionType: 'text',
          questionText: 'What should be exported?',
          position: { x: 250, y: 120 },
        },
        {
          id: 'end-node',
          type: 'end',
          label: 'End',
          resultText: 'Imported/exported result.',
          position: { x: 500, y: 240 },
        },
      ],
      edges: [
        {
          id: 'edge-start-question',
          source: 'start-node',
          target: 'question-node',
        },
        {
          id: 'edge-question-end',
          source: 'question-node',
          target: 'end-node',
        },
      ],
    };

    cy.registerUserApi(email, password).then((accessToken) => {
      cy.createFlowApi(accessToken, {
        title: flowTitle,
        description: 'Flow used to test import/export',
        visibility: 'private',
        status: 'draft',
      }).then((flowId) => {
        cy.saveGraphApi(accessToken, flowId, validGraph);

        cy.loginViaUi(email, password);
        cy.visit(`/flows/${flowId}`);

        cy.contains(flowTitle).should('exist');

        cy.get('[data-cy="export-flow-button"]').click();

        cy.readFile(`cypress/downloads/${exportFileName}`).then(
          (exportedFlow) => {
            cy.visit('/');

            cy.get('[data-cy="import-flow-file-input"]').selectFile(
              {
                contents: Cypress.Buffer.from(JSON.stringify(exportedFlow)),
                fileName: exportFileName,
                mimeType: 'application/json',
              },
              { force: true },
            );

            cy.get('[data-cy="import-flow-submit"]').click();

            cy.get('[data-cy="success-message"]').should(
              'contain',
              'Flow imported successfully.',
            );

            cy.contains(`${flowTitle} (Imported)`).should('exist');
          },
        );
      });
    });
  });
});