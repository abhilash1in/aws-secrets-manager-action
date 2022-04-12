import * as core from '@actions/core'

import { Inputs } from './constants'
import { getSecretsManagerClient, getSecretValueMaps } from './awsUtils'
import { injectSecretValueMapToEnvironment } from './utils'

// secretNames input string is a new line separated list of secret names. Take distinct secret names.
const inputSecretNames: string[] = [...new Set(core.getMultilineInput(Inputs.SECRETS))]

const shouldParseJSON = core.getBooleanInput(Inputs.PARSE_JSON)

const secretPrefix = core.getInput(Inputs.SECRET_PREFIX) || ''

const AWSConfig = {}

const secretsManagerClient = getSecretsManagerClient(AWSConfig)

core.info(
  `Loading secrets ${inputSecretNames.toString()} with prefix: ${secretPrefix} and parse json: ${shouldParseJSON}`
)

getSecretValueMaps(secretsManagerClient, inputSecretNames, shouldParseJSON, secretPrefix)
  .then(maps => {
    injectSecretValueMapToEnvironment(maps)
  })
  .catch(err => {
    core.setFailed(`Action failed with error: ${err}`)
  })
