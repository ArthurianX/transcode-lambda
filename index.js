const { promisify } = require('util')
const fs = require('fs')
const fluentffmpeg = require('fluent-ffmpeg')

const AWS = require('aws-sdk')
const S3 = new AWS.S3()

// const currentTempFiles = []
//
// function timelapsePathFor (name) { return `/tmp/${name}` }
//
// function downloadS3Videos ({ bucket, amount } = {}, { listObjects = promisify(S3.listObjects).bind(S3), getObject = promisify(S3.getObject).bind(S3), writeFile = promisify(fs.writeFile).bind(fs) } = {}) {
//   if (!bucket) throw new Error('bucket missing')
//   return listObjects({ Bucket: bucket })
//     .then(data => {
//       const tasks = data.Contents
//         // .filter(d => d.Key.startsWith('201'))
//         // .filter((d, i) => i > (data.Contents.length - 1 - amount)).map(d => d.Key)
//         .map(file => {
//             currentTempFiles.push(file.Key);
//             const params = { Bucket: bucket, Key: file.Key };
//             return S3.getObject(params).promise().then((gotFile) => {
//               return writeFile(`/tmp/${file.Key}`, gotFile.Body)
//             });
//
//         })
//       return Promise.all(tasks)
//     })
// }
//
// function createTimelapse ({ name, fps } = {}, { ffmpeg = fluentffmpeg } = {}) {
//   const timelapsePath = timelapsePathFor(name)
//   return new Promise((resolve, reject) => {
//     ffmpeg().addInput('/tmp/Depoimentos.mp4').noAudio().outputOptions(`-r ${fps}`).videoCodec('libx264')
//       .on('error', (err) => { console.error('Error during processing', err); reject(err) })
//       .on('end', () => { console.log('Processing finished !'); resolve() })
//       .save(timelapsePath, { end: true })
//   })
// }
//
// function saveTimelapseToS3 ({ bucket, name }, { putObject = promisify(S3.putObject).bind(S3) }) {
//   const timelapsePath = timelapsePathFor(name)
//   return putObject({ Body: fs.readFileSync(timelapsePath), Bucket: bucket, Key: name })
// }

function fetchUploadedVideo({bucket, name} = {}, {listObjects = promisify(S3.listObjects).bind(S3), getObject = promisify(S3.getObject).bind(S3), writeFile = promisify(fs.writeFile).bind(fs)} = {}) {
    const params = { Bucket: bucket, Key: name };
    return S3.getObject(params).promise().then((gotFile) => {
        return writeFile(`/tmp/${name}`, gotFile.Body)
    });
}

function transcodeVideo({name} = {}, {ffmpeg = fluentffmpeg} = {}) {
    return new Promise((resolve, reject) => {
        ffmpeg(`/tmp/${name}`)
            .outputOptions(['-pix_fmt yuv420p', '-profile:v baseline', '-level 3', '-movflags +faststart'])
            .audioCodec('aac')
            .videoCodec('libx264')
            .format('mp4')
            .on('error', (err) => {
                console.error('Error during processing', err);
                reject(err)
            })
            .on('end', () => {
                console.log('Processing finished !');
                resolve()
            })
            .save(`/tmp/TRANSCODED-${name}`, {end: true})
    })
}

function saveTranscodedFileToS3({bucket, name}) {
    const params = {Body: fs.readFileSync(`/tmp/${name}`), Bucket: bucket, Key: name};
    return S3.putObject(params).promise();
}

(async function runAll(bucket = 'kind-media-transcoding-input', name = 'timelapse.mp4', amount = 1, fps = 6)
{
    const srcBucket = 'kind-media-transcoding-input';
    const destBucket = 'kind-media-transcoding-output';
    const srcKey    = 'Depoimentos.mp4';

    transcodeVideo({name: srcKey})

    // fetchUploadedVideo({bucket: srcBucket, name: srcKey})
    //     .then(() => transcodeVideo({name: srcKey}))
    //     .then(() => saveTranscodedFileToS3({bucket: destBucket, name: `TRANSCODED-${}`}))
    //     .then((data) => console.log(null, {success: true, data, bucket: destBucket, name: `TRANSCODED-${srcKey}`}))
    //     .catch(err => { console.log(err) })
})()
