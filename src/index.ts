import * as core from "@actions/core"
import { SecretsManager } from 'aws-sdk'
import { Inputs } from './constants'
import { flattenJSONObject, isJSONObjectString } from './utils'

const secretsManagerClient = new SecretsManager({
  accessKeyId: core.getInput(Inputs.AWS_ACCESS_KEY_ID),
  secretAccessKey: core.getInput(Inputs.AWS_SECRET_ACCESS_KEY),
  region: core.getInput(Inputs.AWS_REGION),
})

const secretNames: string[] = core.getInput(Inputs.SECRET_NAMES).split("\n").filter(x => x !== "")
const shouldParseJSON = (core.getInput(Inputs.PARSE_JSON).trim().toLowerCase() === 'true')
const getSecretValuePromise = async (secretName) => secretsManagerClient.getSecretValue({ SecretId: secretName }).promise()

secretNames.forEach((secretName) => {
  getSecretValuePromise(secretName)
    .then(data => {
      let secretValue
      // Decrypts secret using the associated KMS CMK.
      // Depending on whether the secret is a string or binary, one of these fields will be populated.
      if ('SecretString' in data) {
        secretValue = data.SecretString
      } else {
        const buff = Buffer.from(data.SecretBinary)
        secretValue = buff.toString('ascii')
      }

      // If secretName = 'mySecret' and secretValue='{ "foo": "bar" }'
      // and if secretValue is a valid JSON object string and shouldParseJSON = true, 
      // injected secrets will be of the form 'mySecret.foo' = 'bar'
      if (isJSONObjectString(secretValue) && shouldParseJSON){
        const secretJSON = JSON.parse(secretValue)
        const secretJSONWrapped = {
          secretName: secretJSON
        }
        const secretJSONFlattened = flattenJSONObject(secretJSONWrapped)
        for (const childSecretNameFlattened in secretJSONFlattened){
          core.setSecret(secretJSONFlattened[childSecretNameFlattened])
          core.exportVariable(childSecretNameFlattened, secretJSONFlattened[childSecretNameFlattened])
        }
      } 
      // Else, injected secrets will be of the form 'mySecret' = '{ "foo": "bar" }' (raw secret value string)
      else{
        core.setSecret(secretValue)
        core.exportVariable(secretName, secretValue)
      }
    })
    .catch(err => {
      core.setFailed(`Action failed with error: ${err}`)
      if (err.code === 'DecryptionFailureException')
        // Secrets Manager can't decrypt the protected secret text using the provided KMS key.
        // Deal with the exception here, and/or rethrow at your discretion.
        throw err
      else if (err.code === 'InternalServiceErrorException')
        // An error occurred on the server side.
        // Deal with the exception here, and/or rethrow at your discretion.
        throw err
      else if (err.code === 'InvalidParameterException')
        // You provided an invalid value for a parameter.
        // Deal with the exception here, and/or rethrow at your discretion.
        throw err
      else if (err.code === 'InvalidRequestException')
        // You provided a parameter value that is not valid for the current state of the resource.
        // Deal with the exception here, and/or rethrow at your discretion.
        throw err
      else if (err.code === 'ResourceNotFoundException')
        // We can't find the resource that you asked for.
        // Deal with the exception here, and/or rethrow at your discretion.
        throw err
    })
})