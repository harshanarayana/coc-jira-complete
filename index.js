const { sources, workspace } = require('coc.nvim')
const jc = require('jira-connector')

/**
 * Fetches unresolved JIRA issues for a user
 */
const fetchIssues = (url, user, password) => {
  let c = new jc({
    protocol: "https",
    host: url,
    basic_auth: {
      username: user,
      password: password,
    },
  })

  return c.search.search({
    jql: `assignee=${user} AND resolution = Unresolved order by updated DESC`,
    fields: ["summary", "description", "updated"]
  }).then(issues => issues.issues.map( issue => ({
    key: issue.key,
    title: issue.fields.summary,
  })))
}

exports.activate = async context => {
  const config = workspace.getConfiguration('j')

  const url = config.get('url')
  const user = config.get('user')
  const password = config.get('password')

  if (!url || !user || !password) {
    workspace.showMessage(
      'JIRA configuration missing from :CocConfig',
      'warning'
    )
    return
  }

  let issues = []
  try {
    issues = await fetchIssues(url, user, password)
  } catch (error) {
    workspace.showMessage(
      '[coc-jira-cplt] Failed to fetch JIRA issues, check :CocOpenLog',
      'error'
    )
    console.error('Failed to fetch JIRA issues: ', error)
  }

  let source = {
    name: 'jira-cplt',
    triggerOnly: false,
    doComplete: async () => {
      return {
        items: issues.map(issue => {
          return {
            word: issue.key,
            abbr: `${issue.key} ${issue.title}`
          }
        })
      }
    }
  }
  context.subscriptions.push(sources.createSource(source))
}
