import * as core from '@actions/core'

import { Inputs } from './constants'
import { getSecretsManagerClient, getSecretValueMaps } from './awsUtils'
import { injectSecretValueMapToEnvironment } from './utils'

// secretNames input string is a new line separated list of secret names. Take distinct secret names.
const inputSecretNames: string[] = [...new Set(core.getMultilineInput(Inputs.SECRETS))]

// Check if any secret name contains a wildcard '*'
// const hasWildcard: boolean = inputSecretNames.some(secretName => secretName.includes('*'))

const shouldParseJSON = core.getBooleanInput(Inputs.PARSE_JSON)

const secretPrefix = core.getInput(Inputs.SECRET_PREFIX) || ''

const AWSConfig = {}

const secretsManagerClient = getSecretsManagerClient(AWSConfig)

getSecretValueMaps(secretsManagerClient, inputSecretNames, shouldParseJSON, secretPrefix)
  .then(maps => {
    injectSecretValueMapToEnvironment(maps)
  })
  .catch(err => {
    core.setFailed(`Action failed with error: ${err}`)
  })
