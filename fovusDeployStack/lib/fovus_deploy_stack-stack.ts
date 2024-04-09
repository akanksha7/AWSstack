import * as cdk from 'aws-cdk-lib';
import {Duration} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import {HttpMethods} from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import {App, GitHubSourceCodeProvider} from '@aws-cdk/aws-amplify-alpha';
import {BuildSpec} from "aws-cdk-lib/aws-codebuild";
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';

export class DeployFovusStackStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);



    const dynamoDbTable = new dynamodb.Table(this, 'fovus-ddb', {
      tableName : 'fovus-file-paths',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const bucket_script = new s3.Bucket(this, 'fovus-scripts-2', {
      bucketName: 'fovus-scripts-2',
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const bucket_files = new s3.Bucket(this, 'files-bucket-2', {
      bucketName: 'files-bucket-2',
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    bucket_files.addCorsRule({
      allowedMethods: [ HttpMethods.GET, HttpMethods.POST, HttpMethods.PUT],
      allowedOrigins: [ '*' ],
      exposedHeaders: [ 'ETag' ],
      maxAge: 10000
    });
    bucket_script.addCorsRule({
      allowedMethods: [ HttpMethods.GET],
      allowedOrigins: [ '*' ],
      exposedHeaders: [ 'ETag' ],
      maxAge: 10000
    });

    new s3deploy.BucketDeployment(this, 'DeployFiles', {
      sources: [s3deploy.Source.asset('output_file_processor.py.zip')],
      destinationBucket: bucket_script,
    });

    const lambdaFunctionDeploy = new lambda.Function(this, 'deployEC2Function', {
      runtime: lambda.Runtime.NODEJS_LATEST,
      handler: 'deployEc2.handler',
      functionName: 'deployEC2',
      code: lambda.Code.fromAsset('lambdas/ScaleUpAndDownEc2Instance.zip'),
      timeout: Duration.minutes(5),
      environment : {
        TABLE_NAME : dynamoDbTable.tableName,
      },
    });

    const lambdaFunctionUpload = new lambda.Function(this, 'uploadFileDetailsFunction', {
      runtime: lambda.Runtime.NODEJS_LATEST,
      handler: 'uploadFileDetails.handler',
      functionName: 'uploadFiles',
      code: lambda.Code.fromAsset('lambdas/uploadFileDetails.zip'),
      timeout: Duration.minutes(1)
    });

    const api = new apigateway.RestApi(this, 'fovus-file-upload-api');
    const resource = api.root.addResource('uploadFiles');
    resource.addMethod('POST', new apigateway.LambdaIntegration(lambdaFunctionUpload));


    bucket_script.grantReadWrite(lambdaFunctionDeploy);
    bucket_files.grantReadWrite(lambdaFunctionDeploy);
    bucket_files.grantPut(lambdaFunctionUpload);
    bucket_files.grantPut(lambdaFunctionDeploy);
    bucket_script.grantPut(lambdaFunctionDeploy);
    dynamoDbTable.grantReadWriteData(lambdaFunctionDeploy);

    const cfn_output = new cdk.CfnOutput(this, "api_url",{
      value : api.url,

    });

    // Create Amplify app
    const amplifyApp = new App(this, 'FovusAmplifyApp', {
      sourceCodeProvider: new GitHubSourceCodeProvider({
        owner: 'akanksha7',
        repository: 'awsStack',
        oauthToken: cdk.SecretValue.secretsManager('github'),
      }),
      environmentVariables: {
        REACT_APP_TableName: dynamoDbTable.tableName,
        REACT_APP_API_GATEWAY_URL : cfn_output.value,
        REACT_APP_region :'us-east-1',
        REACT_APP_BUCKET_NAME: bucket_files.bucketName
      },

      buildSpec: BuildSpec.fromObjectToYaml({
        version: "1.0",
        applications: [
          {
            frontend: {
              phases: {
                preBuild: {
                  commands: ["npm ci"],
                },
                build: {
                  commands: ["npm run build"],
                },
              },
              artifacts: {
                baseDirectory: "build",
                files: ["**/*"],
              },
              cache: {
                paths: ["node_modules/**/*"],
              },
            },
            appRoot: "FovusChallenge/client",
          },
        ],
      }),
    });
    const mainBranch = amplifyApp.addBranch("main");




  }
}
