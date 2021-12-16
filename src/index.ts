import * as core from '@actions/core'

import { Inputs } from './constants'
import { getSecretsManagerClient, getSecretNamesToFetch, getSecretValueMap } from './awsUtils'
import { injectSecretValueMapToEnvironment } from './utils'

// secretNames input string is a new line separated list of secret names. Take distinct secret names.
const inputSecretNames: string[] = [...new Set(core.getMultilineInput(Inputs.SECRETS))]

// Check if any secret name contains a wildcard '*'
const hasWildcard: boolean = inputSecretNames.some(secretName => secretName.includes('*'))

const shouldParseJSON = core.getBooleanInput(Inputs.PARSE_JSON)

const secretsManagerClient = getSecretsManagerClient({})

if (hasWildcard) {
  getSecretNamesToFetch(secretsManagerClient, inputSecretNames)
    .then(secretNamesToFetch => {
      secretNamesToFetch.forEach((secretName) => {
        getSecretValueMap(secretsManagerClient, secretName, shouldParseJSON).then(map => {
          injectSecretValueMapToEnvironment(map, core)
        })
      })
    })
    .catch(err => {
      core.setFailed(`Action failed with error: ${err}`)
    })
} else {
  inputSecretNames.forEach((secretName) => {
    getSecretValueMap(secretsManagerClient, secretName, shouldParseJSON)
      .then(map => {
        injectSecretValueMapToEnvironment(map, core)
      })
      .catch(err => {
        core.setFailed(`Action failed with error: ${err}`)
      })
  })
}
