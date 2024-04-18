# Automated VM Creation with Script Execution
This project creates a system that allows you to automatically create a new virtual machine (VM) instance and execute a script on it. Here's an overview of the components involved:

**Responsive web UI:** This uses ReactJS and provides text and file inputs for users to interact with.
Text input: This allows users to enter text data.
File input: This allows users to upload a file.
Submit button: This triggers the upload process.

**S3 storage:** This is where the uploaded file is stored.

**DynamoDB FileTable:** This stores the text input data and the S3 path of the uploaded file.

**API Gateway and Lambda Function:** This is used to save the user inputs and S3 path to DynamoDB.

**EC2 VM instance:** This is the virtual machine that is automatically created and where the script is uploaded and executed.

## How it works

1) Users interact with the web UI and provide text input and upload a file.
2) Clicking the submit button triggers the upload process. The file is uploaded directly to S3 from the browser, and not sent via Lambda.
3) The text input data and S3 path are stored in DynamoDB.
4) A DynamoDB event triggers a script to run in the VM instance.
5) The script performs the following actions:
6) Creates a new VM instance automatically.
7) Downloads the script from S3 to the VM instance.
8) Retrieves the text input data and the uploaded file from DynamoDB.
9) Appends the retrieved text input data to the downloaded file and saves it as a new file.
10) Uploads the new file to S3.
11) Saves the outputs and S3 path of the new file in DynamoDB.
12) The VM instance is terminated automatically.


## Implementation

**Step 1: Set up AWS Environment**  
Make sure you have the AWS CLI and AWS CDK installed and have aws configured with administrative access to a user

**Step 2: Clone the Repository**  
Clone the GitHub repository containing the project:

```
git clone https://github.com/akanksha7/AWSstack.git
cd AWSstack
```

**Step 3: Install Dependencies**  
Install dependencies using npm:
```
npm install
```
**Step 4: Run build**
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
3. Install aws-cdk - `npm install -g aws-cdk`
4. Install aws-cli: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html
    - configure aws-cli by running : `aws configure`
