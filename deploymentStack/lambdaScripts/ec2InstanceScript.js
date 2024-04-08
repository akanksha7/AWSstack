import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { EC2Client, RunInstancesCommand, TerminateInstancesCommand,DescribeInstanceStatusCommand } from "@aws-sdk/client-ec2";
import { SSMClient, SendCommandCommand } from "@aws-sdk/client-ssm";

const ec2Client = new EC2Client({ region: "us-east-1" });
const s3Client = new S3Client({ region: "us-east-1" });
const ssmClient = new SSMClient({ region: "us-east-1" });

export const handler = async (event) => {

    for (const record of event.Records) {
        if (record.eventName === 'INSERT') {
            var instanceId = null;
            try {
                // 1. Create an EC2 instance that can run Python scripts
                const runInstancesCommand = new RunInstancesCommand({
                    ImageId: 'ami-051f8a213df8bc089', // Amazon linux image
                    InstanceType: 't2.micro',
                    KeyName: 'ec2-instance-key-pair',
                    MinCount: 1,
                    MaxCount: 1
                });
                const ec2Response = await ec2Client.send(runInstancesCommand);
                instanceId = ec2Response.Instances[0].InstanceId;

                console.log('EC2 instance created:', instanceId);

                await waitForInstanceInitialization(instanceId);
                console.log('EC2 instance initialized:', instanceId);


                // 2. Download the Python script from S3
                const getObjectCommand = new GetObjectCommand({
                    Bucket: 'fovus-script-storage',
                    Key: 'output_file_processor.py',
                });

                const scriptResponse = await s3Client.send(getObjectCommand);
                const blob = await scriptResponse.Body.transformToByteArray();

                try {
                    //3. Upload the Python script and the DynamoDB event record to the EC2 instance1
                    const sendCommandCommand = new SendCommandCommand({
                        InstanceIds: [instanceId],
                        DocumentName: "AWS-RunShellScript",
                        Parameters: {
                            commands: [
                                'mkdir -p /tmp/scripts',
                                `echo '${JSON.stringify(record)}' > /tmp/scripts/dynamo-event-record.json`,
                                `echo "${String.fromCharCode.apply(String, blob)}" > /tmp/scripts/output_file_processor.py`
                            ]
                        },
                    });

                    await ssmClient.send(sendCommandCommand);
                    console.log("Copied script and record to EC2 instnace");
                }
                catch (error) {
                    console.log(error);
                }


                //4. Run the Python script in the EC2 instance
                const runShellScriptCommand = new SendCommandCommand({
                    InstanceIds: [instanceId],
                    DocumentName: 'AWS-RunShellScript',
                    Parameters: {
                        commands: [
                            'sudo yum install pip -y',
                            'pip install boto3',
                            'python3 /tmp/scripts/output_file_processor.py /tmp/scripts/dynamo-event-record.json'
                        ],
                    },
                });
                await ssmClient.send(runShellScriptCommand);

                console.log('Python script execution and EC2 instance termination completed.');
            }
            catch (err) {
                console.error('Error during the process:', err);
            }
            finally {
                //5. Terminate the EC2 instance
                if (instanceId) {
                    const terminateInstancesCommand = new TerminateInstancesCommand({
                        InstanceIds: [instanceId],
                    });
                    await ec2Client.send(terminateInstancesCommand);
                }
            }
        }
    }

    return { statusCode: 200, body: 'Python script execution triggered' };
};

async function waitForInstanceInitialization(instanceId) {
    const params = {
        InstanceIds: [instanceId]
    };

    try {
        let instanceInitialized = false;
        while (!instanceInitialized) {
            const instanceStatus = await ec2Client.send(new DescribeInstanceStatusCommand(params));
            if (instanceStatus.InstanceStatuses.length > 0) {
                // Check if instance has all status checks passed
                const checksPassed = instanceStatus.InstanceStatuses[0].SystemStatus.Status === "ok" &&
                    instanceStatus.InstanceStatuses[0].InstanceStatus.Status === "ok";
                if (checksPassed) {
                    instanceInitialized = true;
                } else {
                    console.log("Instance checks not passed yet, waiting...");
                    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for 5 seconds before checking again
                }
            } else {
                console.log("Instance status not available, waiting...");
                await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for 5 seconds before checking again
            }
        }
        return "Instance is initialized";
    } catch (err) {
        console.error(err);
        return "Error checking instance status";
    }
}