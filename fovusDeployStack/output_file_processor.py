import boto3
import sys
import json
from botocore.exceptions import ClientError

# AWS region
AWS_REGION = os.environ.get('AWS_REGION', 'us-east-1')

def get_secret(secret_name):
    # Create a Secrets Manager client
    session = boto3.session.Session()
    client = session.client(
        service_name='secretsmanager',
        region_name=AWS_REGION
    )
    # Retrieve the secret value
    try:
        response = client.get_secret_value(SecretId=secret_name)
    except ClientError as e:
        print("Error retrieving secret:", e)
        return None
    else:
        # Parse and return the secret value
        secret = response['SecretString']
        return json.loads(secret)


secret_id = get_secret('access_key_id')
secret_key = get_secret('secret_access_key')

# Extract AWS access key and secret key from the retrieved secret
AWS_ACCESS_KEY_ID = secret_id['accessKeyId']
AWS_SECRET_ACCESS_KEY = secret_key['secret_access_key']

# DynamoDB and S3 clients
dynamodb = boto3.client('dynamodb', region_name=AWS_REGION, aws_access_key_id=AWS_ACCESS_KEY_ID,
                        aws_secret_access_key=AWS_SECRET_ACCESS_KEY)
s3 = boto3.client('s3', region_name=AWS_REGION, aws_access_key_id=AWS_ACCESS_KEY_ID,
                  aws_secret_access_key=AWS_SECRET_ACCESS_KEY)

# DynamoDB table and S3 bucket names
DYNAMODB_TABLE_NAME = os.environ.get('DYNAMODB_TABLE_NAME', 'fovus-file-path-1')
S3_BUCKET_NAME = os.environ.get('S3_BUCKET_NAME','fovus-files-bucket-1')


def lambda_handler(event, context):
    try:
        # 1. Get the inputs from DynamoDB Filetable event by id
        record = event['Records'][0]
        dynamodb_event = record['dynamodb']
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
        output_file_path = f'{input_file_path.rsplit("/", 1)[0]}/{output_file_name}'
        s3.upload_file(f'/tmp/{output_file_name}', S3_BUCKET_NAME, output_file_name)

        # 5. Store the output file path in DynamoDB filetable
        dynamodb.put_item(
            TableName=DYNAMODB_TABLE_NAME,
            Item={
                'id': {'S': event_id},
                'output_file_path': {'S': output_file_path}
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
        print("Usage: python output_file_processor.py filename")
        sys.exit(1)
    filename = sys.argv[1]
    with open(filename, 'r') as file:
        event = json.load(file)
        print(lambda_handler(event, None))
