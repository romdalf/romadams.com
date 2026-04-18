# Why Git? (The "Safety Net" Perspective)
Before we touch the keyboard, let’s talk about why we bother with this extra "admin" work.

* Traceability: Think of Git as a detailed journal. Six months from now, when you wonder, "Why did I change the goal-setting logic?" you can look back at your history and see exactly what you were thinking.
* Reversibility: Every developer has a "Whoops" moment where they accidentally delete a vital function or break the login page. Git is your Infinite Undo button. It allows you to teleport your project back to a time when everything worked perfectly.

## Step 1: Cloning the Repository
Your external tool likely gave you a URL (ending in .git). We need to bring that code from GitHub onto your MacBook.

1. Open your Terminal (Cmd + Space, type "Terminal").
2. Navigate to where you want to keep your code (e.g., cd Documents).
3. Run the following:

```Bash
git clone https://github.com/your-username/coaching-app.git
cd coaching-app
```

## Step 2: Creating a "Feature Branch"
**Rule #1 of Git**: Never work directly on the main branch. The main branch is your "Sacred Ground"—it should always be stable. For new features, we create a branch (a parallel universe).

Let's say you're adding a "Daily Journal" feature:

```Bash
git checkout -b add-journal-feature
```

> ![TIP]
> Claude Tip You can tell Claude Desktop: "I'm on a branch called 'add-journal-feature'. Help me write a Python script for a daily mood tracker."

## Step 3: Development & Committing
Once you’ve written some code (or Claude has written it for you), you need to "save" your progress. In Git, this is a two-step process: Staging and Committing.

1. Stage your changes: This is like putting items in a moving box.

```Bash
git add .
```
2. Commit your changes: This is like taping the box shut and labeling it.

```Bash
git commit -m "Add basic UI for daily journal entries"
```

## Step 4: The Pull Request (PR)
Now you want to merge your new feature back into the main branch.

1. Push to GitHub:
```Bash
git push origin add-journal-feature
```
2. Open the PR: Go to your repository page on GitHub.com. You’ll see a yellow bar saying "Compare & pull request." Click it, describe what you did, and hit "Create pull request."

This is where you (or a teammate) can review the code before it officially joins the project.

## The "Undo" Button: Removing a Commit
We’ve all been there: you committed code, realized it was the wrong approach, and want to go back.

**The "I want to keep my work but fix the label" (Soft Reset)** 
If you made a mistake in the code but don't want to delete the actual files you wrote:

```Bash
git reset --soft HEAD~1
```
This removes the commit record but keeps your code changes in the folder so you can edit them and try again.

**The "Nuclear Option" (Hard Reset)** 
If you want to completely erase the last commit and all the work associated with it:

```Bash
git reset --hard HEAD~1
```
> ![warning]
> Use this sparingly. It’s the "delete forever" button.

## Using Git with Claude Desktop
Since you're using Claude, you can leverage it to make Git easier. Try these prompts:

* "I just finished the login logic. Write a concise Git commit message for me using conventional commit standards."
* "I'm getting a merge conflict in my styles.css. Here is the error [Paste Error]. How do I fix this?"
* "Explain what git status is telling me right now."

You're essentially building a legacy for your software. Treat your Git history with the same care you’d treat a client’s progress notes, and you’ll be a pro in no time!