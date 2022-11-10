# Description  
This is an npx tool for creating a new user in an AWS Cognito user pool.

<br/>

# Usage
<br/>

<pre><code>npx create-cognito-user</code></pre>

This will start an interactive session, in which you will be prompted to insert your new user's details

<br/>

## *Please note!*
<br/>
In order for this tool to work, you must first authenticate in your terminal using the aws cli by running the following command:

<pre><code>aws configure</code></pre>

The authenticated user must have permission to execute the following SDK commands: 
* DescribeUserPoolCommand,
* AdminCreateUserCommand,
* AdminGetUserCommand,
* AdminUpdateUserAttributesCommand
