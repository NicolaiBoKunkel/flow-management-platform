describe('Flow editor', () => {
  it('E2E-003 opens a flow editor, edits node content, and saves the graph', () => {
    const email = `editor-${Date.now()}@test.com`;
    const password = 'test123456';
    const flowTitle = `Cypress Editor Flow ${Date.now()}`;

    const validGraph = {
      nodes: [
        { id: 'start-node', type: 'start', label: 'Start', position: { x: 0, y: 0 } },
        {
          id: 'question-node',
          type: 'question',
          label: 'Question',
          questionType: 'singleChoice',
          position: { x: 250, y: 120 },
        },
        { id: 'end-node', type: 'end', label: 'End', position: { x: 500, y: 240 } },
      ],
      edges: [
        { id: 'edge-start-question', source: 'start-node', target: 'question-node' },
        { id: 'edge-question-end', source: 'question-node', target: 'end-node' },
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
});