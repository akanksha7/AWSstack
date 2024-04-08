import boto3
import sys
import json
from botocore.exceptions import ClientError

# AWS credentials and region
AWS_REGION = 'us-east-1'
AWS_ACCESS_KEY_ID = 'AKIA3FLD3FJSJ7QFUPVF'
AWS_SECRET_ACCESS_KEY = '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'

# DynamoDB and S3 clients
dynamodb = boto3.client('dynamodb', region_name=AWS_REGION, aws_access_key_id=AWS_ACCESS_KEY_ID,
                        aws_secret_access_key=AWS_SECRET_ACCESS_KEY)
s3 = boto3.client('s3', region_name=AWS_REGION, aws_access_key_id=AWS_ACCESS_KEY_ID,
                  aws_secret_access_key=AWS_SECRET_ACCESS_KEY)

# DynamoDB table and S3 bucket names
DYNAMODB_TABLE_NAME = 'fovus-file-table'
S3_BUCKET_NAME = 'fovus-file-storage'


def lambda_handler(event, context):
    try:
        # 1. Get the inputs from DynamoDB Filetable event by id
        #record = event['Records'][0]
        dynamodb_event = event['dynamodb']
        event_id = dynamodb_event['NewImage']['id']['S']

        # 2. Download the input file from S3
        input_file_path = dynamodb_event['NewImage']['input_file_path']['S']
        input_file_name = input_file_path.split('/')[-1]
        s3.download_file(S3_BUCKET_NAME, input_file_name, f'/tmp/{input_file_name}')

        # 3. Append the retrieved input text to the downloaded input file from S3 and save it as output file
        input_text = dynamodb_event['NewImage']['input_text']['S']
        output_file_name = f'out_{event_id}.txt'
        with open(f'/tmp/{output_file_name}', 'w') as f:
            f.write(open(f'/tmp/{input_file_name}', 'r').read())
            f.write('\n')
            f.write(input_text)

        # 4. Upload the output file to S3
        bucket_name = input_file_path.split('/')[0]
        output_file_path = f'{bucket_name}/{output_file_name}'
        s3.upload_file(f'/tmp/{output_file_name}', S3_BUCKET_NAME, output_file_name)

        # 5. Update the id with output file path in DynamoDB filetable
        dynamodb.update_item(
            TableName=DYNAMODB_TABLE_NAME,
            Key={
                'id': {'S': event_id}
            },
            UpdateExpression='SET output_file_path = :val1',
            ExpressionAttributeValues={
                ':val1': {'S': output_file_path}
            }
        )

        return {
            'statusCode': 200,
            'body': 'File processing completed successfully.'
        }
    except ClientError as e:
        print(f'Error: {e}')
        return {
            'statusCode': 500,
            'body': 'Error processing file.'
        }


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print('Usage: python output_file_processor.py filename')
        sys.exit(1)
    filename = sys.argv[1]
    with open(filename, 'r') as file:
        event = json.load(file)
        print(lambda_handler(event, None))
