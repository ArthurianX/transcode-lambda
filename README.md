# timelapse-lambda

## installation

### 1. Deploy the [ffmpeg-lambda-layer](https://serverlessrepo.aws.amazon.com/applications/arn:aws:serverlessrepo:us-east-1:145266761615:applications~ffmpeg-lambda-layer) on your Lambda

### 2. Create two S3 buckets, one for input, one for output

They must be **in the same region as the ffmpeg-lambda-layer**

### 3. Create timelapse lambda

run `./create-aws-lambda` by specifying the needed parameters, below you can find an example.

**in the same region as above!**

```
./create-aws-lambda \
  --region eu-central-1 \
  --lambda KindMediaTranscoder \
  --role arn:aws:iam::523132001812:role/transcoding-lambda-execution
  --ffmpeg arn:aws:lambda:eu-central-1:523132001812:layer:ffmpeg:1
```

### 4. update the lambda with the code

specify the region and the lambda name as above and run:

```
./deploy-aws-lambda \
  --region eu-central-1 \
  --lambda KindMediaTranscoder
```

# running the code locally with aws-cli installed and configured
`nodemon` or run with debug `index.js`

# testing the actual lambda function
`npm install` and take a look at `launch-lambda.js`, which tries to emulate a bucket create event
