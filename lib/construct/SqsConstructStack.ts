import { Construct } from 'constructs';
import { Stack, StackProps } from 'aws-cdk-lib';
import * as sqs from 'aws-cdk-lib/aws-sqs';


export interface SqsConfig{
  serviceName: string,
  queName: string,
  stackProps?: StackProps,
}

export class SqsConstructStack extends Stack {

  public readonly queueUrl:string;

  constructor(scope: Construct, id: string, config: SqsConfig) {
    super(scope, id, config.stackProps);
    
    const queue = new sqs.Queue(this, 'sqs-queue', {
      queueName: config.queName,
    });

    this.queueUrl = queue.queueUrl;

  }

}
  