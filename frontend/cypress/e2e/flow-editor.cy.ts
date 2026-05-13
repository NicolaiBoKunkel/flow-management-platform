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

    cy.request('POST', 'http://localhost:3001/auth/register', {
      email,
      password,
    }).then((registerResponse) => {
      const accessToken = registerResponse.body.accessToken;

      cy.request({
        method: 'POST',
        url: 'http://localhost:3001/flows',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: {
          title: flowTitle,
          description: 'Testing flow editor',
          visibility: 'private',
          status: 'draft',
        },
      }).then((createFlowResponse) => {
        const flowId = createFlowResponse.body.id;

        cy.request({
          method: 'PATCH',
          url: `http://localhost:3001/flows/${flowId}`,
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: {
            graph: validGraph,
          },
        });

        cy.visit('/login');

        cy.get('[data-cy="login-email"]').type(email);
        cy.get('[data-cy="login-password"]').type(password);
        cy.get('[data-cy="login-submit"]').click();

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