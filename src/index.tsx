#!/usr/bin/env node
import dotenv from "dotenv";
import { validateAndAdjustRedmineUrl } from "./lib/helpers.js";
import {
  trackTaskCommand,
  printMonthlySummaryCommand,
  createTaskCommand,
  showHelp,
  searchCommand,
  getEntriesCommand,
  deleteEntryCommand,
  trackTimeCommand,
} from "./lib/commands.js";
import React, { JSX, useEffect, useState } from "react";
import { render, Text } from "ink";
import { Help } from "./components/Help.js";
import { Entries } from "./components/Entries.js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CommandsProps } from "./components/types.js";
import { Search } from "./components/Search.js";
import { togglAuth } from "./constants.js";
import { Toggle } from "./components/Toggle.js";

dotenv.config();

async function main() {
  const [command, arg1, arg2, arg3, arg4] = process.argv.slice(2);

  try {
    const redmineAuth = {
      username: process.env.REDMINE_TOKEN!,
      password: "pass",
    };
    const redmineUrl = validateAndAdjustRedmineUrl(
      process.env.REDMINE_API_URL!
    );

    const togglUrl = process.env.TOGGL_API_URL!;

    const togglWorkspaceId = process.env.TOGGL_WORKSPACE_ID!;
    const defaultProjectId = process.env.DEFAULT_PROJECT!;

    if (
      !process.env.REDMINE_TOKEN ||
      !process.env.REDMINE_API_URL ||
      !process.env.TOGGL_API_TOKEN ||
      !process.env.TOGGL_API_URL ||
      !process.env.TOGGL_WORKSPACE_ID ||
      !process.env.DEFAULT_PROJECT
    ) {
      throw new Error(
        "Missing required environment variables. Please check your .env file."
      );
    }

    switch (command) {
      case "--help":
      case "-h":
        await showHelp();
        break;

      case "create-task":
        const taskName = arg1;
        const projectName = arg2 ?? defaultProjectId;
        await createTaskCommand(taskName, projectName, redmineAuth);
        break;

      case "toggle":
        const daysAgo = arg1 ? parseInt(arg1) : 0;
        const totalHours = arg2 ? parseFloat(arg2) : 8;
        await trackTimeCommand({
          daysAgo,
          totalHours,
          redmineAuth,
          redmineUrl,
          togglAuth,
          togglUrl,
          togglWorkspaceId,
        });
        break;

      case "track":
        const issueID = arg1;
        const hours = arg2 ? parseFloat(arg2) : 0;
        const comment = arg3 ?? "";
        const daysAgoTrack = arg4 ? parseInt(arg4) : 0;
        await trackTaskCommand(
          issueID,
          hours,
          comment,
          daysAgoTrack,
          redmineAuth,
          redmineUrl
        );
        break;

      case "search":
        const searchQuery = arg1;
        await searchCommand(searchQuery, redmineAuth);
        break;

      case "get-entries":
        const daysAgoEntries = arg1 ? parseInt(arg1) : 0;
        await getEntriesCommand(daysAgoEntries, redmineAuth);
        break;

      case "delete":
        const daysAgoDelete = arg1 ? parseInt(arg1) : 0;
        await deleteEntryCommand(daysAgoDelete, redmineAuth);
        break;

      case "print-monthly-summary":
        await printMonthlySummaryCommand(redmineAuth);
        break;

      default:
        console.log("❌ Invalid command. Use --help for options.");
        break;
    }
  } catch (error: any) {
    console.error("An unexpected error occurred:", error.message);
    console.error("🔍 Error details:", {
      command: process.argv.slice(2),
      env: {
        REDMINE_TOKEN: process.env.REDMINE_TOKEN,
        REDMINE_API_URL: process.env.REDMINE_API_URL,
        TOGGL_API_TOKEN: process.env.TOGGL_API_TOKEN,
        TOGGL_API_URL: process.env.TOGGL_API_URL,
        TOGGL_WORKSPACE_ID: process.env.TOGGL_WORKSPACE_ID,
        DEFAULT_PROJECT: process.env.DEFAULT_PROJECT,
      },
    });
    process.exit(1);
  }
}

const OutputMap: Record<string, (props: CommandsProps) => JSX.Element> = {
  "--help": Help,
  "-h": Help,
  "get-entries": Entries,
  search: Search,
  toggle: Toggle,
};

const App = () => {
  const [command, ...args] = process.argv.slice(2);

  const Component =
    OutputMap[command as any] || (() => <Text>Invalid command</Text>);

  return <Component args={args} />;
};

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Optional: exponential backoff
    },
  },
});

render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
