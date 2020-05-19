import * as core from '@actions/core'
import * as glob from '@actions/glob'
import {measure} from './common'

async function run(): Promise<void> {
  try {
    let jekyllSrc = '',
      gemSrc = '',
      gemArr: string[],
      jekyllArr: string[]
    const INPUT_JEKYLL_SRC = core.getInput('JEKYLL_SRC', {}),
      SRC = core.getInput('SRC', {}),
      INPUT_GEM_SRC = core.getInput('GEM_SRC', {})

    await measure({
      name: 'resolve directories',
      block: async () => {
        // Resolve Jekyll directory
        if (INPUT_JEKYLL_SRC) {
          jekyllSrc = INPUT_JEKYLL_SRC
          core.debug(`Using parameter value ${jekyllSrc} as a source directory`)
        } else if (SRC) {
          jekyllSrc = SRC
          core.debug(
            `Using ${jekyllSrc} environment var value as a source directory`
          )
        } else {
          jekyllArr = await (
            await glob.create(
              ['**/_config.yml', '!**/vendor/bundle/**'].join('\n')
            )
          ).glob()
          for (let i = 0; i < jekyllArr.length; i++) {
            jekyllArr[i] = jekyllArr[i].replace(/_config\.yml/, '')
          }
          if (jekyllArr.length > 1) {
            throw new Error(
              `error: found ${jekyllArr.length} _config.yml! Please define which to use with input variable "JEKYLL_SRC"`
            )
          } else {
            jekyllSrc = jekyllArr[0]
          }
        }
        core.debug(`Resolved ${jekyllSrc} as source directory`)

        // Resolve Gemfile directory
        if (INPUT_GEM_SRC) {
          gemSrc = INPUT_GEM_SRC
          if (!gemSrc.endsWith('Gemfile')) {
            if (!gemSrc.endsWith('/')) {
              gemSrc = gemSrc.concat('/')
            }
            gemSrc = gemSrc.concat('Gemfile')
          }
        } else {
          gemArr = await (
            await glob.create(['**/Gemfile', '!**/vendor/bundle/**'].join('\n'))
          ).glob()
          if (gemArr.length > 1) {
            if (!jekyllSrc.endsWith('/')) {
              jekyllSrc = jekyllSrc.concat('/')
            }
            if (jekyllSrc.startsWith('.')) {
              jekyllSrc = jekyllSrc.replace(
                /\.\/|\./,
                `${process.env.GITHUB_WORKSPACE}/`
              )
            } else if (!jekyllSrc.startsWith('/')) {
              jekyllSrc = `${process.env.GITHUB_WORKSPACE}/`.concat(jekyllSrc)
            }
            for (const element of gemArr) {
              if (element.replace(/Gemfile/, '') === jekyllSrc) {
                gemSrc = element
              }
            }
            if (!gemSrc) {
              throw new Error(
                `found ${gemArr.length} Gemfiles, and failed to resolve them! Please define which to use with input variable "GEM_SRC"`
              )
            } else {
              core.warning(`found ${gemArr.length} Gemfiles!`)
            }
          } else {
            gemSrc = gemArr[0]
          }
        }
        core.debug(`Resolved ${gemSrc} as Gemfile`)
        core.exportVariable('BUNDLE_GEMFILE', `${gemSrc}`)
      }
    })
    core.saveState('jekyllSrc', jekyllSrc)
    core.saveState('gemSrc', gemSrc)
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
