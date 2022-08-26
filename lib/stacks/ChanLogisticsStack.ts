
import { Construct } from 'constructs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Secret } from 'aws-cdk-lib/aws-ecs';

import { Stack } from 'aws-cdk-lib';
import { RepoConstructStack } from '../construct/RepoConstructStack';
import { EcsConstructStack } from '../construct/EcsConstructStack';
import { LOGISTICS_GIT_REPO } from '../../config/repositoryConfig';
import { ChanServiceProps, SERVICE } from './ChanStack';
import { EndpointConstructStack } from '../construct/EndpointConstructStack';
import { RdsConstructStack } from '../construct/RdsConstructStack';
import { LogisticsApiStack } from '../api/LogisticsApiStack';
import { SqsConstructStack } from '../construct/SqsConstructStack';
import { LambdaConstructStack } from '../construct/LambdaConstructStack';
import { ManagedPolicy } from 'aws-cdk-lib/aws-iam';


export class ChanLogisticsStack extends Stack{

  constructor(scope: Construct, id: string, props: ChanServiceProps){
    super(scope, id, props.stackProps);
 
    const applicationName = props.appllicationName.toLocaleLowerCase();
    const LOGISTICS_SQS_NAME = 'logistics_matching';

    const betaConfig = {
      serviceName : `${applicationName}`,
      ContainerPort : 8080,
      dbInstanceName: `${applicationName}`,
      dbPort : 5432,
      dbAdminName : 'postgres',
    }
    
    const vpc = props.vpc;
    
    //GitHub & ECR repository Setting
     const serviceRepo = new RepoConstructStack(this, `repo`, {
      ecrName: applicationName, 
      gitRepo: LOGISTICS_GIT_REPO,
      ecrLoad: false,
      stackProps: {stackName : `${props.stackProps.stackName}-repo`, env: props.stackProps.env}
    });

    //Rds Setting
    const rdsInsatnce = new RdsConstructStack(this, `rds`, {
      dbName: betaConfig.serviceName,
      allocatedStorageGb: 5,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc,
      port: betaConfig.dbPort,
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_14_2
      }),
      dbAdminName: betaConfig.dbAdminName,
      dbKeyName: betaConfig.serviceName,
      stackProps: {stackName : `${props.stackProps.stackName}-rds`, env: props.stackProps.env}
    })

    //endpoint Setting
    const endpoints = new EndpointConstructStack(this, 'endpoint', {
      serviceName: betaConfig.serviceName,
      vpc,
      serviceId: SERVICE.LOGISTICS,
      serviceList: props.endpoints,
      stackProps: {stackName : `${props.stackProps.stackName}-endpoint`, env: props.stackProps.env},
    })

    const dns = {
      //[SERVICE.CUSTOMER]: Fn.importValue(`${betaConfig.serviceName}-${SERVICE.CUSTOMER.toString()}-dns`),
      //[SERVICE.SELLER  ]: Fn.importValue(`${betaConfig.serviceName}-${SERVICE.SELLER  .toString()}-dns`),
    }

    //create IAM
    const user = new iam.User(this, 'user', {
        userName: betaConfig.serviceName + "_IAM"
    });
    user.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonSQSFullAccess'));
    user.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonSQSReadOnlyAccess'));

    const accessKey = new iam.AccessKey(this, 'AccessKey', { user });
    const IamSecret = new secretsmanager.Secret(this, 'Secret', {
        secretName: betaConfig.serviceName + "_secretKey",
        secretStringValue: accessKey.secretAccessKey,

    });
    

    if(!rdsInsatnce.db.secret) throw 'db secret error';

    const secretEnv = {
      DATABASE_USERNAME: Secret.fromSecretsManager(rdsInsatnce.db.secret, "username"),
      DATABASE_PASSWORD: Secret.fromSecretsManager(rdsInsatnce.db.secret, "password"),
      DATABASE_HOST: Secret.fromSecretsManager(rdsInsatnce.db.secret, "host"),
      DATABASE_NAME: Secret.fromSecretsManager(rdsInsatnce.db.secret, "dbname"),
      DATABASE_PORT: Secret.fromSecretsManager(rdsInsatnce.db.secret, "port"),
      SECRET_KEY: Secret.fromSecretsManager(IamSecret),
    };

    const normalEnv = {
      ACCESS_KEY: accessKey.accessKeyId,
      LOGISTICS_SQS_NAME: LOGISTICS_SQS_NAME,
      //ENDPOINT_CUSTOMER: dns[SERVICE.CUSTOMER],
      //ENDPOINT_SELLER  : dns[SERVICE.SELLER  ],
    };

    //Ecs Setting
    const service = new EcsConstructStack(this, `ecs`,  {
      serviceName: betaConfig.serviceName,
      clusterName: `${betaConfig.serviceName}-cluster`,
      dbKeyName: betaConfig.serviceName,
      vpc,
      loadbalancer: props.loadbalancer,
      containerSecretEnv: secretEnv,
      containerEnv: normalEnv,
      ecrRepo: serviceRepo.ecrRepo,
      containerPort: betaConfig.ContainerPort,
      stackProps: {stackName : `${props.stackProps.stackName}-ecs`, env: props.stackProps.env},
    });
    service.addDependency(endpoints);
    
    const restApi = new LogisticsApiStack(this, `api`,  {
      serviceName: betaConfig.serviceName,
      vpc,
      apigateway: props.httpApi,
      loadbalancer: props.loadbalancer,
      listener: service.listner,
      stackProps: {stackName : `${props.stackProps.stackName}-api`, env: props.stackProps.env}
    });

    const que = new SqsConstructStack(this, 'sqs', {
      serviceName: betaConfig.serviceName,
      stackProps: {stackName : `${props.stackProps.stackName}-sqs`, env: props.stackProps.env},
      queName: LOGISTICS_SQS_NAME,
    });

    const lambda = new LambdaConstructStack(this, 'lambda', {
      serviceName: betaConfig.serviceName,
      vpc,
      lambdaEnv: {
        LOGISTICS_URL: props.loadbalancer.loadBalancerDnsName,
        LOGISTICS_PATH: '/logistics/invoice',
        QUEUE_URL :que.queueUrl,
      },
      functionname:  "RequestlogisticsMatching",
      stackProps: {stackName : `${props.stackProps.stackName}-lambda`, env: props.stackProps.env},
    });
    
    /*
    //CI / CD Setting
    const serviceCicd = new CicdConstructStack(this, `cicd`, {
      serviceName: `${applicationName}`,
      gitRepo: serviceRepo.gitRepo,
      ecrRepo: serviceRepo.ecrRepo,
      //serviceBeta: service.service,
      stackProps: {stackName : `${props.stackProps.stackName}-cicd`, env: props.stackProps.env}
    });
    */
  }

}