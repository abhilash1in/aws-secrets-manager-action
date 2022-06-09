import * as core from '@actions/core'
import { AWSError, SecretsManager } from 'aws-sdk'
import { GetSecretValueResponse } from 'aws-sdk/clients/secretsmanager'
import { PromiseResult } from 'aws-sdk/lib/request'
import { flattenJSONObject, isJSONObjectString, filterBy, injectSecretValueMapToEnvironment } from './utils'

const getSecretsManagerClient = (config: Record<string, any>): SecretsManager => new SecretsManager(config)

const getSecretValue = (secretsManagerClient: SecretsManager, secretName: string):
  Promise<PromiseResult<GetSecretValueResponse, AWSError>> => {
  core.debug(`Fetching '${secretName}'`)
  return secretsManagerClient.getSecretValue({ SecretId: secretName }).promise()
}

const listSecretsPaginated = (secretsManagerClient, nextToken) =>
  secretsManagerClient.listSecrets({ NextToken: nextToken }).promise()

const iterateSecrets = (resolver, secretsManagerClient: SecretsManager, allSecretNames: string[], nextToken = null) => {
  listSecretsPaginated(secretsManagerClient, nextToken)
    .then(res => {
      // get all non-deleted secret names
      res['SecretList'].forEach(secret => {
        if (!('DeletedDate' in secret)) {
          allSecretNames.push(secret['Name'])
        }
      })

      // fetch nextToken if it exists, reset to null otherwise
      if ('NextToken' in res) {
        iterateSecrets(resolver, secretsManagerClient, allSecretNames, res['NextToken'])
      } else {
        resolver(allSecretNames)
      }
    })
    .catch(err => {
      throw err;
    })
}

const listSecrets = (secretsManagerClient: SecretsManager): Promise<Array<string>> => {
  return new Promise<Array<string>>((resolve, reject) => {
    const allSecretNames: string[] = []
    iterateSecrets(resolve, secretsManagerClient, allSecretNames)
  })
}

const getSecretValueMap = (secretsManagerClient: SecretsManager, secretName: string, shouldParseJSON = false) => {
  return new Promise((resolve, reject) => {
    getSecretValue(secretsManagerClient, secretName)
      .then(data => {
        let secretValue
        // Decrypts secret using the associated KMS CMK.
        // Depending on whether the secret is a string or binary, one of these fields will be populated.
        if ('SecretString' in data) {
          secretValue = data['SecretString']
        } else {
          const buff = Buffer.from(data['SecretBinary'].toString(), 'base64')
          secretValue = buff.toString('ascii')
        }
        let secretValueMap = {}

        // If secretName = 'mySecret' and secretValue='{ "foo": "bar" }'
        // and if secretValue is a valid JSON object string and shouldParseJSON = true,
        // injected secrets will be of the form 'mySecret.foo' = 'bar'
        if (isJSONObjectString(secretValue) && shouldParseJSON) {
          const secretJSON = JSON.parse(secretValue)
          const secretJSONWrapped = {}
          secretJSONWrapped[secretName] = secretJSON
          const secretJSONFlattened = flattenJSONObject(secretJSONWrapped)
          secretValueMap = secretJSONFlattened
        }
        // Else, injected secrets will be of the form 'mySecret' = '{ "foo": "bar" }' (raw secret value string)
        else {
          secretValueMap[secretName] = secretValue
        }
        resolve(secretValueMap)
      })
      .catch(err => {
        if ('code' in err) {
          if (err.code === 'DecryptionFailureException')
            // Secrets Manager can't decrypt the protected secret text using the provided KMS key.
            // Deal with the exception here, and/or rethrow at your discretion.
            return reject(err)
          else if (err.code === 'InternalServiceErrorException')
            // An error occurred on the server side.
            // Deal with the exception here, and/or rethrow at your discretion.
            return reject(err)
          else if (err.code === 'InvalidParameterException')
            // You provided an invalid value for a parameter.
            // Deal with the exception here, and/or rethrow at your discretion.
            return reject(err)
          else if (err.code === 'InvalidRequestException')
            // You provided a parameter value that is not valid for the current state of the resource.
            // Deal with the exception here, and/or rethrow at your discretion.
            return reject(err)
          else if (err.code === 'ResourceNotFoundException')
            // We can't find the resource that you asked for.
            // Deal with the exception here, and/or rethrow at your discretion.
            return reject(err)
          else if (err.code === 'AccessDeniedException')
            // We don't have access to the resource that you asked for.
            // Deal with the exception here, and/or rethrow at your discretion.
            return reject(err)
          else
            // Fetch failed due to an unrecognized error code
            return reject(err)
        }
        // Fetch failed for some other reason
        return reject(err)
      })
  })
}

const getSecretNamesToFetch =
  (secretsManagerClient: SecretsManager, inputSecretNames: string[]): Promise<Array<string>> => {
    return new Promise<Array<string>>((resolve, reject) => {
      // list secrets, filter against wildcards and fetch filtered secrets
      // else, fetch specified secrets directly
      const secretNames: string[] = []
      listSecrets(secretsManagerClient)
        .then(secrets => {
          inputSecretNames.forEach(inputSecretName => {
            secretNames.push(...filterBy(secrets, inputSecretName))
          })
          resolve([...new Set(secretNames)])
        })
        .catch(err => {
          reject(err)
        })
    })
  }

const fetchAndInject = (secretsManagerClient: SecretsManager,
  secretNamesToFetch: Array<string>, shouldParseJSON: boolean): void => {
  core.debug(`Will fetch ${secretNamesToFetch.length} secrets: ${secretNamesToFetch}`)
  secretNamesToFetch.forEach((secretName) => {
    getSecretValueMap(secretsManagerClient, secretName, shouldParseJSON)
      .then(map => {
        injectSecretValueMapToEnvironment(map)
      })
      .catch(err => {
        core.setFailed(`Failed to fetch '${secretName}'. Error: ${err}.`)
      })
  })
}
export {
  getSecretsManagerClient,
  getSecretValue,
  listSecrets,
  getSecretValueMap,
  getSecretNamesToFetch,
  fetchAndInject
}
