describe('Auth and flow smoke test', () => {
  const email = `e2e-user-${Date.now()}@example.com`;
  const password = 'password123';
  const flowTitle = `E2E Flow ${Date.now()}`;

  it('E2E-001 logs in and E2E-002 creates a flow', () => {
    cy.registerViaUi(email, password);

    cy.url().should('eq', `${Cypress.config().baseUrl}/`);
    cy.get('[data-cy="current-user-email"]').should('contain', email);

    cy.get('[data-cy="my-flows-section"]').should('exist');

    cy.createFlowViaUi(
      flowTitle,
      'Created by Cypress E2E test',
      'private',
      'draft',
    );

    cy.get('[data-cy="success-message"]').should(
      'contain',
      'Flow created successfully.',
    );

    cy.get('[data-cy="my-flows-section"]').should('contain', flowTitle);
    cy.get('[data-cy="flow-list-item"]').contains(flowTitle).should('exist');
  });
});