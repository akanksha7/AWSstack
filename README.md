# Fovus Coding Challenge

## Overview

The project consists of the following components:

**Amazon S3 Buckets:** Stores the uploaded files and the script to perform the steps in the ec2 instance.
**Amazon DynamoDB Table:** Stores metadata about the uploaded files, including the S3 path.  
**Amazon API Gateway:** Provides an HTTP endpoint for uploading files and triggering the script run.  
**AWS Lambda Functions:** Handle file upload, store metadata in DynamoDB, and trigger the script run.  
**Amazon EC2 Instance:** Runs the script triggered by DynamoDB events.

## Implementation

**Step 1: Set up AWS Environment**  
Make sure you have the AWS CLI and AWS CDK installed and configured.

**Step 2: Clone the Repository**  
Clone the GitHub repository containing the project:

```
git clone https://github.com/your_username/your_repository.git
cd your_repository
```

**Step 3: Install Dependencies**  
Install dependencies using npm:
```
npm install
```
**Step 4: Run buildn**
```
npm run build
```
**Step 5: Deploy Application**
```
cdk bootstrap
```

**Step 6: Deploy Application**
```
cdk deploy
```
**Step 7: Input file from React frontend**  
Input file name and the file to upload from the UI. Click on submit.

## File Upload and Processing

Upon uploading, the file is immediately added to the S3 bucket (`files-bucket`), and its path is promptly recorded in the DynamoDB table (`fovus-file-paths`). However, it may take approximately 3-4 minutes for the updates reflecting the output_file and output_file_path in both the S3 bucket and DynamoDB table to propagate. This delay is attributed to the initialization time required for the EC2 instance. Once the instance is fully initialized and the script has executed, final changes can be verified.



## Screenshots

### DynamoDB:
![image](https://github.com/akanksha7/AWSstack/assets/18654204/d00f7675-1555-4844-adb0-6f923790efcf)


## AWS CDK Docs To Refer

1. https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html
    - Create Administrative user - https://docs.aws.amazon.com/IAM/latest/UserGuide/getting-set-up.html#create-an-admin
        - Enable AWS IAM Identity Center - https://docs.aws.amazon.com/singlesignon/latest/userguide/get-set-up-for-idc.html
            - Select: Enable with AWS Organizations
        - In IAM Identity Center, grant administrative access to an administrative user.
            - IAM Identity Center: https://us-east-1.console.aws.amazon.com/singlesignon/home?region=us-east-1#!/instances/72239c385425574d/dashboard
            - Follow instructions to create administrative user in IAM Identity Center: https://docs.aws.amazon.com/singlesignon/latest/userguide/quick-start-default-idc.html
        - Add Administrative permissions
        - Sign in with new user
3. Install aws-cdk - npm install -g aws-cdk
4. Install aws-cli: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html
    - configure aws-cli by running : aws configure (supply the same credentials)
5. Create a dir - mkdir fovusDeployStack
   - Go in - cd fovusDeployStack
   - Initialize the app - cdk init app --language typescript
   - cdk bootstrap
   - Creates a CDKToolkit stack on CloudFormation (can see on UI as well)
   - To restart the bootstrap delete the stack by going on the CloudFormation ui or running:
   aws cloudformation delete-stack --stack-name CDKToolkit
   - Then rerun: cdk bootstrap
   - cdk deploy
