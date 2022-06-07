
import { RemovalPolicy, Stack } from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr'
import { Construct } from 'constructs';

export type RdsConstructProps = {
} 

export class RepoConstruct extends Construct{
  constructor(scope: Construct, id: string, props: RdsConstructProps){
    super(scope, id);
  }
}