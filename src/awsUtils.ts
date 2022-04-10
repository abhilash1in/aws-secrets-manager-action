import * as core from '@actions/core'
import { AWSError, SecretsManager } from 'aws-sdk'
import { GetSecretValueResponse } from 'aws-sdk/clients/secretsmanager'
import { PromiseResult } from 'aws-sdk/lib/request'
import { flattenJSONObject, isJSONObjectString, filterBy } from './utils'

const getSecretsManagerClient = (config: Record<string, any>): SecretsManager => new SecretsManager(config)

const getSecretValue = (secretsManagerClient: SecretsManager, secretName: string):
  Promise<PromiseResult<GetSecretValueResponse, AWSError>> => {
  core.debug(`Fetching '${secretName}'`)
  return secretsManagerClient.getSecretValue({ SecretId: secretName }).promise()
}

const listSecretsPaginated = (secretsManagerClient, nextToken) =>
  secretsManagerClient.listSecrets({ NextToken: nextToken }).promise()

const listSecrets = (secretsManagerClient: SecretsManager): Promise<Array<string>> => {
  return new Promise<Array<string>>((resolve, reject) => {
    let nextToken: string = null
    const allSecretNames: string[] = []
    do {
      listSecretsPaginated(secretsManagerClient, nextToken)
        .then(res => {
          // fetch nextToken if it exists, reset to null otherwise
          if ('NextToken' in res) {
            nextToken = res['NextToken']
          } else {
            nextToken = null
          }
          // get all non-deleted secret names
          res['SecretList'].forEach(secret => {
            if (!('DeletedDate' in secret)) {
              allSecretNames.push(secret['Name'])
            }
          })
          resolve(allSecretNames)
        })
        .catch(err => {
          reject(err)
        })
    }
    while (nextToken)
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

const constructSecretName = (secretName: string, secretPrefix = ''): string => {
  return secretPrefix ? `${secretPrefix}/${secretName}` : secretName
}

const deconstructSecretName = (secretName: string, secretPrefix = ''): string => {
  return secretName.replace(new RegExp(`^${secretPrefix}/`, 'g'), '')
}

const getSecretNamesToFetch =
  (secretsManagerClient: SecretsManager, inputSecretNames: string[], secretPrefix = ''): Promise<Array<string>> => {
    const hasWildcard: boolean = inputSecretNames.some(secretName => secretName.includes('*'))

    return new Promise<Array<string>>((resolve, reject) => {
      // list secrets, filter against wildcards and fetch filtered secrets
      // else, fetch specified secrets directly
      const secretNames: string[] = []
      if (hasWildcard) {
        listSecrets(secretsManagerClient)
          .then(secrets => {
            inputSecretNames.forEach(inputSecretName => {
              secretNames.push(...filterBy(secrets, constructSecretName(inputSecretName, secretPrefix)))
            })
            resolve([...new Set(secretNames)])
          })
          .catch(err => {
            reject(err)
          })
      } else {
        resolve([...new Set(inputSecretNames.map(n => constructSecretName(n, secretPrefix)))])
      }
    })
  }

const normalizedSecretMaps = (maps, secretPrefix: string): Record<string, any> => {
  const flatArray = maps.map(e =>
    Object.keys(e).map(k => [deconstructSecretName(k, secretPrefix), e[k]] as [string, string])
  ).flat()

  const ret: Record<string, any> = {} as Record<string, any>
  flatArray.forEach((e: Array<string>) => ret[e[0]] = e[1])
  core.debug(`Fetched secret names: ${Object.keys(ret)}`)

  return ret
}

const getSecretValueMaps = (secretsManagerClient: SecretsManager,
  inputSecretNames: string[], shouldParseJSON: boolean, secretPrefix = ''): Record<string, any> => {
  core.debug(`Will fetch ${inputSecretNames.length} secrets: ${inputSecretNames}`)
  return new Promise((resolve, reject) => {
    getSecretNamesToFetch(secretsManagerClient, inputSecretNames, secretPrefix).then(names => {
      core.debug(`Secrets to fetch: ${names.toString()}, requested: ${secretPrefix} - ${inputSecretNames.toString()}`)
      Promise.all(names.map(secretName => {
        core.debug(`Fetched secret value for: ${secretName}`)
        return getSecretValueMap(secretsManagerClient, secretName, shouldParseJSON)
      }))
        .then(maps => resolve(normalizedSecretMaps(maps, secretPrefix)))
        .catch(err => reject(err))
    })
  })
}

export {
  constructSecretName,
  deconstructSecretName,
  getSecretsManagerClient,
  getSecretValue,
  listSecrets,
  getSecretValueMap,
  getSecretValueMaps,
  getSecretNamesToFetch
}
