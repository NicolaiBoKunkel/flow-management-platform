describe('Flow analysis', () => {
  it('E2E-005 shows graph analysis metrics after projection sync', () => {
    const email = `analysis-${Date.now()}@test.com`;
    const password = 'test123456';
    const flowTitle = `Analysis Flow ${Date.now()}`;

    const validGraph = {
      nodes: [
        { id: 'start-node', type: 'start', label: 'Start', position: { x: 0, y: 0 } },
        {
          id: 'question-node',
          type: 'question',
          label: 'Question',
          questionType: 'singleChoice',
          position: { x: 250, y: 100 },
        },
        { id: 'end-node', type: 'end', label: 'End', position: { x: 500, y: 200 } },
      ],
      edges: [
        { id: 'edge-start-question', source: 'start-node', target: 'question-node' },
        { id: 'edge-question-end', source: 'question-node', target: 'end-node' },
      ],
    };

    cy.registerUserApi(email, password).then((accessToken) => {
      cy.createFlowApi(accessToken, {
        title: flowTitle,
        description: 'Flow created for analysis E2E test',
      }).then((flowId) => {
        cy.saveGraphApi(accessToken, flowId, validGraph);

        cy.loginViaUi(email, password);
        cy.visit(`/flows/${flowId}`);

        cy.contains(flowTitle).should('exist');
        cy.get('[data-cy="flow-analysis-panel"]').should('exist');

        cy.get('[data-cy="sync-projection-button"]').click();

        cy.get('[data-cy="analysis-results"]').should('exist');
        cy.get('[data-cy="analysis-nodes-value"]').should('contain', '3');
        cy.get('[data-cy="analysis-edges-value"]').should('contain', '2');
        cy.get('[data-cy="analysis-start-nodes-value"]').should('contain', '1');
        cy.get('[data-cy="analysis-end-nodes-value"]').should('contain', '1');
        cy.get('[data-cy="analysis-cycles-value"]').should('contain', 'No');
      });
    });
  });
});