import * as cdk from 'aws-cdk-lib';
import {Duration} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import {HttpMethods} from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import {App, CodeCommitSourceCodeProvider} from '@aws-cdk/aws-amplify-alpha';
import {BuildSpec} from "aws-cdk-lib/aws-codebuild";
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as codecommit from "aws-cdk-lib/aws-codecommit";

//Deployment stack to create required S3 buckets, DynamoDB table, API gateway and Lambda functions
export class DeployFovusStackStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //DynamoDb table to store file_name and file_paths
    const dynamoDbTable = new dynamodb.Table(this, 'file-paths-id-1', {
      tableName : 'fovus-file-path-1',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    //S3 bucket to store script
    const bucket_script = new s3.Bucket(this, 'scripts-id-1', {
      bucketName: 'fovus-scripts-bucket-1',
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    //S3 bucket to store input and output files
    const bucket_files = new s3.Bucket(this, 'files-id-1', {
      bucketName: 'fovus-files-bucket-1',
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

    new s3deploy.BucketDeployment(this, 'id', {
      sources: [s3deploy.Source.asset('output_file_processor.py.zip')],
      destinationBucket: bucket_script,
    });

    // lambda funtion to scale up/down ec2 instance and run script
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

    //Lambda function to upload files to S3 bucket
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

    // add permissions to access S3 buckets and DynamoDB
    bucket_script.grantReadWrite(lambdaFunctionDeploy);
    bucket_files.grantReadWrite(lambdaFunctionDeploy);
    bucket_files.grantPut(lambdaFunctionUpload);
    bucket_files.grantPut(lambdaFunctionDeploy);
    bucket_script.grantPut(lambdaFunctionDeploy);
    dynamoDbTable.grantReadWriteData(lambdaFunctionDeploy);

    const cfn_output = new cdk.CfnOutput(this, "api_url",{
      value : api.url,

    });

    //Creation of the source control repository
    const amplifyReactSampleRepo = new codecommit.Repository(
        this,
        "AmplifyReactRepo",
        {
          repositoryName: "amplify-react-repo",
        }
    );

    //Amplify deployment
    const amplifyApp = new App(this, "fovus-file-upload", {
      sourceCodeProvider: new CodeCommitSourceCodeProvider({
        repository: amplifyReactSampleRepo,
      }),
      environmentVariables: {
            REACT_APP_TableName: dynamoDbTable.tableName,
            REACT_APP_API_GATEWAY_URL : cfn_output.value,
            REACT_APP_REGION :'us-east-1',
            REACT_APP_BUCKET_NAME: bucket_files.bucketName,
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
