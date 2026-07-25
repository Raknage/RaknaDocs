---
title: Conventional Commit Messages
Description: Quick reference for good git commit messages
source: https://gist.github.com/kolynzb/2e6a57511e300940773dc2e2fa8c0567
---

<!-- https://gist.github.com/kolynzb/2e6a57511e300940773dc2e2fa8c0567 -->

See how a minor change to your commit message style can make you a better problem solver and team player, help in automatic generation of the changelog and simple navigation through git history (eg. ignoring style changes).

Basic: `git commit -m <message>`

Detailed: `git commit -m <title> -m <description>`

Format: `<type>(<scope>): <subject>`

`<scope>` is optional

## Example

Without Scope (_if change is global and cant be scoped_)

```bash
feat: add hat wobble
^--^  ^------------^
|     |
|     +-> Summary in present tense.
|
+-------> Type: Chore, Docs, Feat, Fix, Refactor, Style, or Test.

# example
chore: add tailwind css
```

With Scope

```bash
feat(scope): add magical unicorn
^--^^-----^  ^------------------^
|       |              |
|       |              +-> Summary in present tense. Starting with add, remove, update, do.
|       |              +-> Think about: If I commit this, my code would .... add magical unicorn
|       |
|       +-> optional scope of the commit, component-name, container
|
+-------> Type: chore, docs, feat, fix, refactor, style, or test.

# Example
feat(search): add support for searching by date range
```

## Commit Types

- `feat`: (a new feature is introduced with the changes)
- `fix`: (bug fix has occured, not a fix to a build script)
- `docs`: (changes to the documentation)
- `style`: (formatting, missing semi colons, etc; no production code change)
- `refactor`: (refactoring production code, eg. renaming a variable)
- `test`: (adding missing tests, refactoring tests; no production code change)
- `chore`: (changes that do not relate to a fix or feature and don't modify src or test files (for example updating dependencies or change in production code))
- `perf` – (performance improvements)
- `ci` – (continuous integration related)
- `build` – (changes that affect the build system or external dependencies)
- `revert` – (reverts a previous commit)

## Description

Template with detail

```bash
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

If it contains breaking changes.

```bash
fix!: fix foo to enable bar

This fixes the broken behavior of the component by doing xyz.

BREAKING CHANGE
Before this fix foo wasn't enabled at all, behavior changes from <old> to <new>

Closes D2IQ-12345
```

Clearer example

```bash
feat(search)!: add support for searching by date range

BREAKING CHANGE: The search API now requires a start and end date to be specified for all searches. The old API, which only accepted a single search term, is no longer supported.

This commit adds a new feature to the search module that allows users to search for records within a specific date range. The date range can be specified using two new fields on the search form: a start date and an end date.

- Adds new fields to the search form for specifying the date range
- Updates the search API to accept the start and end dates as parameters
- Modifies the search results page to display the selected date range

Closes #223
```

# Guidelines:

1. **Capitalization and Punctuation**: Use lowercase for all and do not end in punctuation. _for Non Conventional Commits, remember to capitalize the first word_.
2. **Length**: The first line should ideally be no longer than 50 characters, and the body should be restricted to 72 characters.
3. **Content**: Be direct, try to eliminate filler words and phrases in these sentences (examples: though, maybe, I think, kind of). Think like a journalist.
4. **Footer**: Footer could be link to an issue or jira story and begins with keyword closes`Closes D2IQ-<JIRA #>`
5. **Body**: uses the imperative, present tense: “change” not “changed” nor “changes” and includes motivation for the change and contrasts with previous behavior.
   - More Info:
     - http://365git.tumblr.com/post/3308646748/writing-git-commit-messages
     - http://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html
6. **Scope**: The `<scope>` can be empty (eg. if the change is a global or difficult to assign to a single component), in which case the parentheses are omitted.ex. init,config,proxy.
7. **BREAKING CHANGE**: a commit that has a footer or appends `!` after the type/scope introduces a breaking API change (correlating with MAJOR in Semantic Versioning). A BREAKING CHANGE can be part of commits of any type.

## References

- [how-to-write-better-git-commit-messages](https://www.freecodecamp.org/news/how-to-write-better-git-commit-messages/)
- [Commitsen to enfore rules](https://commitizen-tools.github.io/commitizen/)
- [Conventional Commits Docs](https://www.conventionalcommits.org/)
- [Convention Commit In Brief](http://karma-runner.github.io/0.10/dev/git-commit-msg.html)
- [Writing the perfect git commit message](https://www.daren.be/blog/2022/02/writing-the-perfect-git-commit-message)
- [Git guide](https://docs.github.com/en/get-started/using-git/about-git)

## Source

https://gist.github.com/kolynzb/2e6a57511e300940773dc2e2fa8c0567
