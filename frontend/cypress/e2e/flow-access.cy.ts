describe('Flow access control', () => {
  it('E2E-006 allows a shared viewer to view but not edit a flow', () => {
    const ownerEmail = `owner-${Date.now()}@test.com`;
    const viewerEmail = `viewer-${Date.now()}@test.com`;
    const password = 'test123456';
    const flowTitle = `Viewer Access Flow ${Date.now()}`;

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
          position: { x: 250, y: 100 },
        },
        {
          id: 'end-node',
          type: 'end',
          label: 'End',
          position: { x: 500, y: 200 },
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

    cy.request('POST', 'http://localhost:3001/auth/register', {
      email: ownerEmail,
      password,
    }).then((ownerRegisterResponse) => {
      const ownerToken = ownerRegisterResponse.body.accessToken;

      cy.request('POST', 'http://localhost:3001/auth/register', {
        email: viewerEmail,
        password,
      });

      cy.request({
        method: 'POST',
        url: 'http://localhost:3001/flows',
        headers: {
          Authorization: `Bearer ${ownerToken}`,
        },
        body: {
          title: flowTitle,
          description: 'Flow shared with viewer in Cypress E2E test',
          visibility: 'shared',
          status: 'draft',
        },
      }).then((createFlowResponse) => {
        const flowId = createFlowResponse.body.id;

        cy.request({
          method: 'PATCH',
          url: `http://localhost:3001/flows/${flowId}`,
          headers: {
            Authorization: `Bearer ${ownerToken}`,
          },
          body: {
            graph: validGraph,
          },
        });

        cy.request({
          method: 'POST',
          url: `http://localhost:3001/flows/${flowId}/access`,
          headers: {
            Authorization: `Bearer ${ownerToken}`,
          },
          body: {
            email: viewerEmail,
            role: 'viewer',
          },
        });

        cy.visit('/login');

        cy.get('[data-cy="login-email"]').type(viewerEmail);
        cy.get('[data-cy="login-password"]').type(password);
        cy.get('[data-cy="login-submit"]').click();

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