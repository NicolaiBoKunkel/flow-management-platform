describe('Auth and flow smoke test', () => {
  const email = `e2e-user-${Date.now()}@example.com`;
  const password = 'password123';
  const flowTitle = `E2E Flow ${Date.now()}`;

  it('E2E-001 logs in and E2E-002 creates a flow', () => {
    cy.visit('/register');

    cy.get('[data-cy="register-email"]').type(email);
    cy.get('[data-cy="register-password"]').type(password);
    cy.get('[data-cy="register-submit"]').click();

    cy.url().should('eq', `${Cypress.config().baseUrl}/`);
    cy.get('[data-cy="current-user-email"]').should('contain', email);

    cy.get('[data-cy="my-flows-section"]').should('exist');

    cy.get('[data-cy="create-flow-title"]').type(flowTitle);
    cy.get('[data-cy="create-flow-description"]').type('Created by Cypress E2E test');
    cy.get('[data-cy="flow-visibility"]').select('private');
    cy.get('[data-cy="flow-status"]').select('draft');
    cy.get('[data-cy="create-flow-submit"]').click();

    cy.get('[data-cy="success-message"]').should(
      'contain',
      'Flow created successfully.',
    );

    cy.get('[data-cy="my-flows-section"]').should('contain', flowTitle);
    cy.get('[data-cy="flow-list-item"]').contains(flowTitle).should('exist');
  });
});