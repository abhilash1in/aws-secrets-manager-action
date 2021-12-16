import * as core from '@actions/core'

import { Inputs } from './constants'
import { getSecretsManagerClient, getSecretNamesToFetch, getSecretValueMap } from './awsUtils'
import { injectSecretValueMapToEnvironment } from './utils'

// secretNames input string is a new line separated list of secret names. Take distinct secret names.
const inputSecretNames: string[] = [...new Set(core.getMultilineInput(Inputs.SECRETS))]

// Check if any secret name contains a wildcard '*'
const hasWildcard: boolean = inputSecretNames.some(secretName => secretName.includes('*'))

const shouldParseJSON = core.getBooleanInput(Inputs.PARSE_JSON)

const AWSConfig = {}
if(core.getInput(Inputs.AWS_REGION) !== '') {
  AWSConfig['region'] = core.getInput(Inputs.AWS_REGION)
}

const secretsManagerClient = getSecretsManagerClient(AWSConfig)

if (hasWildcard) {
  core.debug('Found wildcard secret names')
  getSecretNamesToFetch(secretsManagerClient, inputSecretNames)
    .then(secretNamesToFetch => {
      core.debug(`Found ${secretNamesToFetch.length} secrets to fetch: ${secretNamesToFetch}`)
      secretNamesToFetch.forEach((secretName) => {
        core.debug(`Fetching ${secretName}`)
        getSecretValueMap(secretsManagerClient, secretName, shouldParseJSON).then(map => {
          injectSecretValueMapToEnvironment(map)
        })
      })
    })
    .catch(err => {
      core.setFailed(`Action failed with error: ${err}`)
    })
} else {
  inputSecretNames.forEach((secretName) => {
    core.debug(`Fetching ${secretName}`)
    getSecretValueMap(secretsManagerClient, secretName, shouldParseJSON)
      .then(map => {
        injectSecretValueMapToEnvironment(map)
      })
      .catch(err => {
        core.setFailed(`Action failed with error: ${err}`)
      })
  })
}
