
import { CfnOutput, RemovalPolicy, SecretValue, Stack } from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import { Construct } from 'constructs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as sm from 'aws-cdk-lib/aws-secretsmanager';

export type RdsConstructProps = {
  vpc:ec2.Vpc,
  port:number,
  subnetType: ec2.SubnetType,
  engine: rds.IInstanceEngine,
  dbName: string,
  allocatedStorageGb: number,
  instanceType: ec2.InstanceType,
  dbAdminName: string,
  dbKeyName: string,
} 

export type dbInfo = {
  dbName: string,
  dbHost: string,
  dbPort: string,
  dbAdminName: string,
  dbKeyName: string,
  dbKeyArn: string,
}

export class RdsConstruct extends Construct{
  public readonly db:rds.DatabaseInstance;
  public readonly dbInfo: dbInfo;

  constructor(scope: Construct, id: string, props: RdsConstructProps){
    super(scope, id);

    const cred = new rds.DatabaseSecret(this, 'dbSecret', {
      username: props.dbAdminName,
      secretName: props.dbKeyName,
      
    });

    const db = new rds.DatabaseInstance(this, 'RdsInstance', {
      databaseName: props.dbName,
      vpc: props.vpc,
      vpcSubnets: {subnetType: props.subnetType},
      port: props.port,
      engine: props.engine,
      instanceType: props.instanceType,
      allocatedStorage: props.allocatedStorageGb,
      credentials: rds.Credentials.fromSecret(cred),
      storageEncrypted: false, 
      removalPolicy: RemovalPolicy.DESTROY,
      publiclyAccessible: false,
    })
    this.dbInfo = {
      dbName: props.dbName,
      dbAdminName: props.dbAdminName,
      dbKeyName: cred.secretName,
      dbKeyArn: cred.secretArn,
      dbPort: `${props.port}`,
      dbHost: db.dbInstanceEndpointAddress,
    }

  }
}