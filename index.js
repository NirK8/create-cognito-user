#! /usr/bin/env node

import {
  CognitoIdentityProviderClient,
  DescribeUserPoolCommand,
  AdminCreateUserCommand,
  AdminGetUserCommand,
  AdminUpdateUserAttributesCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import inquirer from "inquirer";
import _ from "lodash";

const client = new CognitoIdentityProviderClient();

const promtUserPoolAndUsername = async () => {
  const inquirerQuestions = [
    {
      name: "userPoolId",
      message: "User Pool ID:",
      default: "",
      validate: (input) => {
        if (!input) return "User Pool ID is required!";
        return true;
      },
    },
    {
      name: "username",
      message: "Insert the new user's username (email address):",
      default: "",
      validate: (input) => {
        if (!input) return "Username is required!";
        return true;
      },
    },
  ];
  const answers = await inquirer.prompt(inquirerQuestions);
  return answers;
};

const checkIfShouldUpdateAttributes = async () => {
  const { shouldUpdateAttributes } = await inquirer.prompt({
    type: "confirm",
    name: "shouldUpdateAttributes",
    message: "Do you want to update user attributes?",
    default: false,
  });
  return shouldUpdateAttributes;
};
const promtAttributesModifications = async (userPoolId) => {
  const shouldUpdateAttributes = await checkIfShouldUpdateAttributes();
  if (!shouldUpdateAttributes) return [];
  const modifications = await promtNewAttributes(userPoolId);
  return modifications;
};

const logUserInput = (userPoolId, username, attributesModifications) => {
  attributesModifications.forEach((mod) => {
    console.log(`${mod.Name} ===> ${mod.Value}`);
  });
  console.log(`User Pool Id: ${userPoolId}`);
  console.log(`username: ${username}`);
};

const promtUserConfirmation = async () => {
  const { executionConfirmed } = await inquirer.prompt({
    type: "confirm",
    name: "executionConfirmed",
    message: "Create user with the input above?",
    default: true,
  });
  return executionConfirmed;
};

const getMutableAttributes = async (userPoolId) => {
  const getUserPoolCommand = new DescribeUserPoolCommand({
    UserPoolId: userPoolId,
  });
  const userPoolResponse = await client.send(getUserPoolCommand);
  const userPoolAttributes = userPoolResponse.UserPool.SchemaAttributes;
  const mutableAttributes = userPoolAttributes.filter((attr) => attr.Mutable);
  return mutableAttributes;
};

const promtAttributesToUpdate = async (attributes) => {
  const attributesNames = attributes.map((attr) => attr.Name);
  const { attributesToUpdate } = await inquirer.prompt({
    type: "checkbox",
    name: "attributesToUpdate",
    message: "Check the attributes you want to update",
    choices: attributesNames,
  });
  return attributesToUpdate;
};

const getAttributesToUpdate = async (userPoolId) => {
  const mutableAttributes = await getMutableAttributes(userPoolId);
  const attributesToUpdate = await promtAttributesToUpdate(mutableAttributes);
  return attributesToUpdate;
};

const promtNewAttributes = async (userPoolId) => {
  const attributesToUpdate = await getAttributesToUpdate(userPoolId);
  let modifications = [];
  for (let index = 0; index < attributesToUpdate.length; index++) {
    const attr = attributesToUpdate[index];
    const modification = await promtNewAttribute(attr);
    const attributeName = Object.keys(modification)[0];
    const attributeValue = modification[attributeName];
    modifications.push({
      Name: attributeName,
      Value: attributeValue,
    });
  }
  return modifications;
};

const promtNewAttribute = async (attr) => {
  const modification = await inquirer.prompt({
    name: attr,
    message: `Insert the new value for $${attr}`,
    default: "",
  });
  return modification;
};

const transformUserAttributesArrayToUser = (attributes) =>
  _(attributes)
    .mapKeys((attr) => attr.Name.replace(/^(custom:)/, ""))
    .mapValues((attr) => {
      return attr.Value;
    })
    .valueOf();

const createBlankCognitoUser = async (userPoolId, username) => {
  const adminCreateUserCommandInput = {
    UserPoolId: userPoolId,
    Username: username,
  };
  const command = new AdminCreateUserCommand(adminCreateUserCommandInput);
  const response = await client.send(command);
  const userAttributes = response.User.Attributes;
  const newUserEmail = userAttributes.find(
    (attr) => attr.Name === "email"
  ).Value;
  return newUserEmail;
};

const updateUserAttributes = async (userPoolId, username, userAttributes) => {
  const updateUserAttributesCommand = new AdminUpdateUserAttributesCommand({
    Username: username,
    UserPoolId: userPoolId,
    UserAttributes: userAttributes,
  });
  const response = await client.send(updateUserAttributesCommand);
  const statusCode = response.$metadata.httpStatusCode;
  return statusCode;
};

const getUser = async (userPoolId, username) => {
  const client = new CognitoIdentityProviderClient();
  const command = new AdminGetUserCommand({
    UserPoolId: userPoolId,
    Username: username,
  });
  const response = await client.send(command);
  const userAttributes = response.UserAttributes;
  const user = transformUserAttributesArrayToUser(userAttributes);
  return user;
};

const createUser = async () => {
  const { userPoolId, username } = await promtUserPoolAndUsername();
  const attributesModifications = await promtAttributesModifications(
    userPoolId
  );
  logUserInput(userPoolId, username, attributesModifications);
  const executionConfirmed = await promtUserConfirmation();
  if (executionConfirmed) {
    const newUserEmail = await createBlankCognitoUser(userPoolId, username);
    const statusCode = await updateUserAttributes(
      userPoolId,
      newUserEmail,
      attributesModifications
    );
    const createdUser = await getUser(userPoolId, newUserEmail);
    console.log("\x1b[32m", "User successfully created!");
    console.log(createdUser);
  } else {
    console.log("Operation canceled");
  }
};

createUser();
