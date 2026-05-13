describe('Flow access control', () => {
  it('E2E-006 allows a shared viewer to view but not edit a flow', () => {
    const ownerEmail = `owner-${Date.now()}@test.com`;
    const viewerEmail = `viewer-${Date.now()}@test.com`;
    const password = 'test123456';
    const flowTitle = `Viewer Access Flow ${Date.now()}`;

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

    cy.registerUserApi(ownerEmail, password).then((ownerToken) => {
      cy.registerUserApi(viewerEmail, password);

      cy.createFlowApi(ownerToken, {
        title: flowTitle,
        description: 'Flow shared with viewer in Cypress E2E test',
        visibility: 'shared',
      }).then((flowId) => {
        cy.saveGraphApi(ownerToken, flowId, validGraph);
        cy.shareFlowApi(ownerToken, flowId, viewerEmail, 'viewer');

        cy.loginViaUi(viewerEmail, password);
        cy.visit(`/flows/${flowId}`);

        cy.contains(flowTitle).should('exist');
        cy.get('[data-cy="flow-canvas"]').should('exist');

        cy.get('[data-cy="flow-editor-toolbar"]').should('not.exist');
        cy.get('[data-cy="save-flow-graph"]').should('not.exist');
        cy.get('[data-cy="sharing-panel"]').should('not.exist');

        cy.contains(
          'You can view this flow graph, but only the owner or a shared editor can modify it.',
        ).should('exist');
      });
    });
  });
});