describe('Flow player', () => {
  it('E2E-004 plays a numeric flow and reaches the correct branch', () => {
    const email = `player-${Date.now()}@test.com`;
    const password = 'test123456';
    const flowTitle = `Numeric Play Flow ${Date.now()}`;

    const numericGraph = {
      nodes: [
        {
          id: 'start-node',
          type: 'start',
          label: 'Start',
          introText: 'Welcome to the numeric flow.',
          position: { x: 0, y: 0 },
        },
        {
          id: 'age-question',
          type: 'question',
          label: 'Age question',
          questionType: 'number',
          questionText: 'How old are you?',
          position: { x: 250, y: 100 },
        },
        {
          id: 'young-end',
          type: 'end',
          label: 'Young result',
          resultText: 'You reached the young branch.',
          position: { x: 500, y: 0 },
        },
        {
          id: 'adult-end',
          type: 'end',
          label: 'Adult result',
          resultText: 'You reached the adult branch.',
          position: { x: 500, y: 150 },
        },
      ],
      edges: [
        {
          id: 'edge-start-question',
          source: 'start-node',
          target: 'age-question',
        },
        {
          id: 'edge-under-18',
          source: 'age-question',
          target: 'young-end',
          condition: {
            kind: 'number',
            operator: 'lt',
            value: 18,
          },
        },
        {
          id: 'edge-18-plus',
          source: 'age-question',
          target: 'adult-end',
          condition: {
            kind: 'number',
            operator: 'gte',
            value: 18,
          },
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
          description: 'Numeric flow created for Cypress E2E test',
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
            graph: numericGraph,
          },
        });

        cy.visit('/login');

        cy.get('[data-cy="login-email"]').type(email);
        cy.get('[data-cy="login-password"]').type(password);
        cy.get('[data-cy="login-submit"]').click();

        cy.visit(`/flows/${flowId}/play`);

        cy.contains(flowTitle).should('exist');

        cy.get('[data-cy="start-flow-button"]').click();

        cy.get('[data-cy="continue-flow-button"]').click();

        cy.get('[data-cy="numeric-answer-input"]').type('18');

        cy.get('[data-cy="submit-numeric-answer"]').click();

        cy.get('[data-cy="flow-result-text"]').should(
          'contain',
          'You reached the adult branch.',
        );

        cy.get('[data-cy="flow-completed-message"]').should(
          'contain',
          'This flow has been completed.',
        );
      });
    });
  });
});