/// <reference types="cypress" />

type FlowVisibility = 'private' | 'shared' | 'public';
type FlowStatus = 'draft' | 'published' | 'archived';

type CreateFlowInput = {
  title: string;
  description: string;
  visibility?: FlowVisibility;
  status?: FlowStatus;
};

declare global {
  namespace Cypress {
    interface Chainable {
      registerViaUi(email: string, password: string): Chainable<void>;

      loginViaUi(email: string, password: string): Chainable<void>;

      createFlowViaUi(
        title: string,
        description: string,
        visibility?: FlowVisibility,
        status?: FlowStatus,
      ): Chainable<void>;

      registerUserApi(email: string, password: string): Chainable<string>;

      createFlowApi(
        accessToken: string,
        input: CreateFlowInput,
      ): Chainable<string>;

      saveGraphApi(
        accessToken: string,
        flowId: string,
        graph: unknown,
      ): Chainable<Cypress.Response<unknown>>;

        shareFlowApi(
            accessToken: string,
            flowId: string,
            email: string,
            role: 'viewer' | 'editor',
        ): Chainable<Cypress.Response<unknown>>;
    }
  }
}

Cypress.Commands.add('registerViaUi', (email, password) => {
  cy.visit('/register');

  cy.get('[data-cy="register-email"]').type(email);
  cy.get('[data-cy="register-password"]').type(password);
  cy.get('[data-cy="register-submit"]').click();
});

Cypress.Commands.add('loginViaUi', (email, password) => {
  cy.visit('/login');

  cy.get('[data-cy="login-email"]').type(email);
  cy.get('[data-cy="login-password"]').type(password);
  cy.get('[data-cy="login-submit"]').click();
});

Cypress.Commands.add(
  'createFlowViaUi',
  (title, description, visibility = 'private', status = 'draft') => {
    cy.get('[data-cy="create-flow-title"]').type(title);
    cy.get('[data-cy="create-flow-description"]').type(description);
    cy.get('[data-cy="flow-visibility"]').select(visibility);
    cy.get('[data-cy="flow-status"]').select(status);
    cy.get('[data-cy="create-flow-submit"]').click();
  },
);

Cypress.Commands.add('registerUserApi', (email, password) => {
  return cy
    .request('POST', 'http://localhost:3001/auth/register', {
      email,
      password,
    })
    .then((response) => response.body.accessToken as string);
});

Cypress.Commands.add('createFlowApi', (accessToken, input) => {
  return cy
    .request({
      method: 'POST',
      url: 'http://localhost:3001/flows',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: {
        title: input.title,
        description: input.description,
        visibility: input.visibility ?? 'private',
        status: input.status ?? 'draft',
      },
    })
    .then((response) => response.body.id as string);
});

Cypress.Commands.add('saveGraphApi', (accessToken, flowId, graph) => {
  return cy.request({
    method: 'PATCH',
    url: `http://localhost:3001/flows/${flowId}`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: {
      graph,
    },
  });
});

Cypress.Commands.add('shareFlowApi', (accessToken, flowId, email, role) => {
  return cy.request({
    method: 'POST',
    url: `http://localhost:3001/flows/${flowId}/access`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: {
      email,
      role,
    },
  });
});

export {};