import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import neo4j, { Driver, Session } from 'neo4j-driver';

@Injectable()
export class Neo4jService implements OnModuleInit, OnModuleDestroy {
  private driver: Driver;

  constructor() {
    const uri = process.env.NEO4J_URI;
    const username = process.env.NEO4J_USERNAME;
    const password = process.env.NEO4J_PASSWORD;

    if (!uri || !username || !password) {
      throw new Error(
        'Neo4j environment variables are missing. Required: NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD',
      );
    }

    this.driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
  }

  async onModuleInit() {
    await this.driver.verifyConnectivity();
    await this.ensureSchema();
  }

  async onModuleDestroy() {
    await this.driver.close();
  }

  getSession(): Session {
    return this.driver.session();
  }

  private async ensureSchema() {
    const session = this.getSession();

    try {
      await session.executeWrite(async (tx) => {
        await tx.run(`
          CREATE CONSTRAINT flow_node_unique IF NOT EXISTS
          FOR (n:FlowNode)
          REQUIRE (n.flowId, n.nodeId) IS UNIQUE
        `);

        await tx.run(`
          CREATE INDEX flow_node_flow_id IF NOT EXISTS
          FOR (n:FlowNode)
          ON (n.flowId)
        `);

        await tx.run(`
          CREATE INDEX flow_node_type IF NOT EXISTS
          FOR (n:FlowNode)
          ON (n.type)
        `);
      });
    } finally {
      await session.close();
    }
  }
}
