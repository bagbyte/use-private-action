"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const exec = __importStar(require("@actions/exec"));
const io = __importStar(require("@actions/io"));
const path = __importStar(require("path"));
const yaml = require('js-yaml');
// Default error message describing the `action` input parmeter format
const ACTION_ERROR = `Provided 'action' is not valid, it must have the following format: '{org}/{repo}[/path]@ref'`;
// This method generates a random string to be useed as temporary folder to clone the action repo
function randomFolderName() {
    return Math.random().toString(36).substring(2, 15);
}
// This method clones the action repository
function cloneRepository(tempFolder, repositoryUrl) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield exec.exec('git', ['clone', repositoryUrl, tempFolder]);
        }
        catch (err) {
            core.error(err);
            throw new Error('There was an error while trying to clone the action repository');
        }
    });
}
// This method checks out the requested repo's reference (branch/tag/commit)
function checkout(tempFolder, reference) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield exec.exec('git', ['checkout', '-f', '--detach', reference], { cwd: tempFolder });
        }
        catch (err) {
            core.error(err);
            throw new Error(`There was an error while trying to checkout '${reference}'`);
        }
    });
}
// This method parses the `action.yml` file and execute the action
function executeAction(actionFileFolder) {
    return __awaiter(this, void 0, void 0, function* () {
        // Prepare an empty string which will contain the content of the `action.yml` file
        let actionFileContent = '';
        // Create an object to listen on the stdout of the cat command
        const options = {
            listeners: {
                stdout: (data) => {
                    actionFileContent += data.toString();
                },
            }
        };
        try {
            // Use cat to fetch the content of `action.yml` file
            yield exec.exec('cat', [actionFileFolder + '/action.yml'], options);
        }
        catch (err) {
            core.error(err);
            throw new Error(`There was an error while trying to read 'action.yml'`);
        }
        let actionFileObject;
        try {
            // Convert the YML file into a javascript object
            actionFileObject = yield yaml.safeLoad(actionFileContent);
        }
        catch (err) {
            core.error(err);
            throw new Error(`The 'action.yml' file seems to have an invalid format`);
        }
        // Check if the `action.yml` file has properly written
        if (!('runs' in actionFileObject) || !('using' in actionFileObject.runs)) {
            throw new Error(`There was an error while paesing 'action.yml' file, missing 'runs.using'`);
        }
        // Check if the action is based on node
        if (!actionFileObject.runs.using.startsWith('node')) {
            throw new Error(`Unexpected value '${actionFileObject.runs.using}' for 'runs.using' in the 'action.yml' file`);
        }
        try {
            let currentPath = '';
            // Get the full path of the current path
            yield exec.exec('pwd', [], {
                listeners: {
                    stdline: (data) => {
                        currentPath = data;
                    }
                }
            });
            // Get the full path of the main file of the action to execute
            const mainFullPath = path.join(currentPath, actionFileFolder, actionFileObject.runs.main.replace(/^((.\/)|(\/))/, ''));
            // Execute the action 
            yield require(mainFullPath);
        }
        catch (err) {
            core.error(err);
            throw new Error(`There was an error while trying to execute the action`);
        }
    });
}
// This method deletes the folder used for the repository clone
function deleteFolder(tempFolder) {
    return __awaiter(this, void 0, void 0, function* () {
        // Cleanup
        if (tempFolder) {
            try {
                yield io.rmRF(tempFolder);
            }
            catch (err) {
                core.error(err);
                core.setFailed(`There was an error while trying to delete temp folder '${tempFolder}'`);
            }
        }
    });
}
// This method checks out the code from the repository and branch where the action has been called
function checkoutCode() {
    return __awaiter(this, void 0, void 0, function* () {
        // Read `private-action` input parmeter
        const action = core.getInput('private-action');
        // Read `private-action-token` input parmeter
        const token = core.getInput('private-action-token');
        // If `private-action` input prameter is missing, return an error
        if (!action) {
            core.setFailed(`Missing 'private-action' input parameter`);
            return;
        }
        // If `private-action-token` input prameter is missing, return an error
        if (!token) {
            core.setFailed(`Missing 'private-action-token' input parameter`);
            return;
        }
        // Extract `ref` from `private-action`
        const [repoParts, ref] = action.split('@');
        // If `ref` is missing, return an error
        if (!ref) {
            core.setFailed(ACTION_ERROR);
            return;
        }
        // Extract all components from `private-action` input parameter
        const [org, repo, path] = repoParts.split('/');
        // If `org` or `repo` is missing, return an error
        if (!org || !repo) {
            core.setFailed(ACTION_ERROR);
            return;
        }
        // Create a random folder name where to checkout the action
        const tempFolderName = randomFolderName();
        try {
            // Generate repository URL for the action to checkout
            const url = `https://${token}:x-oauth-basic@github.com/${org}/${repo}.git`;
            // Clone the action repository
            yield cloneRepository(tempFolderName, url);
            // Checkout the reference
            yield checkout(tempFolderName, ref);
            // Set the expected path for the `action.yml` file
            const actionFileFolder = [tempFolderName, path].filter(p => p).join('/');
            // Execute the action
            yield executeAction(actionFileFolder);
        }
        catch (err) {
            core.setFailed(err);
        }
        finally {
            // Cleanup
            deleteFolder(tempFolderName);
        }
    });
}
// Start the execution
checkoutCode();
