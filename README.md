## Steps to deploy app
  1. cdk bootstrap --profile [profile]
  2. cdk deploy --profile [profile]

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
2. open: vim /home/[user]/.bashrc
    - at the last line at the env variables
        - EXPORT AWS_ACCESS_KEY_ID=
        - EXPORT AWS_SECRET_ACCESS_KEY=
        - EXPORT AWS_SESSION_TOKEN= 
    - source /home/[user]/.bashrc
3. Install aws-cdk - npm install -g aws-cdk (You might need to upgrade you node version to 20)
4. Install aws-cli for mac: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html
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
