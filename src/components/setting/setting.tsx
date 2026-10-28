import React, { Component } from 'react';
import './setting.scss';
const style = require('./setting.module.scss');

import { Modal } from 'antd';
import { Button, Collapse, Icon, Input, message, Tooltip } from 'antd';

import * as github from '../../utils/github-auth';
import { KevastGist } from '../../utils/kevast-gist';
import { setting } from '../../utils/store';

interface Prop {
  onSet: () => void;
}

export interface State {
  token: string;
  login: string;
  password: string;
  gistId?: string;
  filename?: string;
  loading: boolean;
  authLoading: boolean;
  deviceAuth?: github.DeviceAuthorization;
  importModal: boolean;
  importValue: string;
}

class Setting extends Component<Prop, State> {
  public constructor(props: Prop) {
    super(props);
    this.state = {
      token: '',
      login: '',
      password: '',
      loading: false,
      authLoading: false,
      importModal: false,
      importValue: '',
    };
  }
  public render() {
    return (
      <div className={style.wrapper}>
        <img className={style.logo} src='/icon/icon128.png' />
        {this.state.login ? (
          <div className={style.auth}>
            <span>
              Signed in as <b>{this.state.login}</b>
            </span>
            <Button
              icon='logout'
              size='small'
              onClick={this.handleSignOut}
              loading={this.state.authLoading}
            >
              Sign out
            </Button>
          </div>
        ) : (
          <Button
            type='primary'
            icon='github'
            block={true}
            className={style.input}
            loading={this.state.authLoading}
            onClick={this.handleAuthorize}
          >
            Sign in with GitHub
          </Button>
        )}
        <Modal
          title='Authorize with GitHub'
          visible={!!this.state.deviceAuth}
          footer={null}
          closable={false}
          maskClosable={false}
          keyboard={false}
        >
          {this.state.deviceAuth && (
            <div>
              <p>Open GitHub and enter this code to authorize SyncMyCookie:</p>
              <h2 className={style.code}>{this.state.deviceAuth.userCode}</h2>
              <p>
                <Button type='primary' onClick={this.handleOpenVerification}>Open GitHub</Button>{' '}
                <Button onClick={this.handleCopyCode}>Copy code</Button>
              </p>
              <p>Waiting for authorization...</p>
            </div>
          )}
        </Modal>
        <Tooltip title='NOT your GitHub password, but a key to encrypt your cookies.' placement='topLeft'>
          <Input
            name='password'
            placeholder='Password'
            prefix={<Icon type='key' style={{ color: 'rgba(0,0,0,.25)' }} />}
            allowClear={true}
            onChange={this.handleChange}
            value={this.state.password}
            className={style.input}
          />
        </Tooltip>
        <Collapse bordered={false} className={style.collapse}>
          <Collapse.Panel header='Optional' key='2' className={style.panel}>
            <Input
              name='gistId'
              placeholder='Gist ID'
              prefix={<Icon type='fork' style={{ color: 'rgba(0,0,0,.25)' }} />}
              allowClear={true}
              onChange={this.handleChange}
              value={this.state.gistId}
              className={style.input}
            />
            <Input
              name='filename'
              placeholder='File Name'
              prefix={<Icon type='file' style={{ color: 'rgba(0,0,0,.25)' }} />}
              allowClear={true}
              onChange={this.handleChange}
              value={this.state.filename}
              className={[style.input, style.filename].join(' ')}
            />
          </Collapse.Panel>
        </Collapse>
        <Button
          type='primary'
          disabled={!this.state.token || !this.state.password}
          onClick={this.handleClick}
          block={true}
          icon='setting'
          loading={this.state.loading}
        >
          Set
        </Button>
        <div className={style.port}>
          <Button
            type='primary'
            icon='logout'
            className={style.button}
            onClick={this.handleExport}
            disabled={!this.state.password ||
              !this.state.gistId ||
              !this.state.filename}
          >
            Export
          </Button>
          <Button
            icon='login'
            className={style.button}
            onClick={this.handleImportOpen}
          >
            Import
          </Button>
          <Modal
            title='Import Setting'
            visible={this.state.importModal}
            onOk={this.handleImport}
            onCancel={this.handleImportClose}
          >
            <Input
              placeholder='Paste here'
              onChange={this.handleImportChange}
            />
          </Modal>
        </div>
      </div>
    );
  }
  public async componentDidMount() {
    const token = await setting.get('token') || '';
    this.setState({
      token,
      password: await setting.get('password') || '',
      gistId: await setting.get('gistId') || '',
      filename: await setting.get('filename') || '',
    });
    if (token) {
      this.setState({ authLoading: true });
      this.loadUser(token);
    }
  }
  private async loadUser(token: string) {
    try {
      const user = await github.getUser(token);
      this.setState({ login: user.login });
    } catch (err) {
      if ((err as any).status === 401) {
        await github.signOut();
        this.setState({ token: '', login: '' });
      }
    } finally {
      this.setState({ authLoading: false });
    }
  }
  private handleAuthorize = async () => {
    this.setState({ authLoading: true });
    try {
      const auth = await github.startAuthorization();
      this.setState({ deviceAuth: auth });
      await navigator.clipboard.writeText(auth.userCode).catch(() => undefined);
      const token = await github.waitForAuthorization(auth);
      const user = await github.getUser(token);
      this.setState({ token, login: user.login, deviceAuth: undefined });
      message.success(`Signed in as ${user.login}`);
    } catch (err) {
      this.setState({ deviceAuth: undefined });
      message.error((err as Error).message || 'GitHub authorization failed');
    } finally {
      this.setState({ authLoading: false });
    }
  }
  private handleOpenVerification = () => {
    if (this.state.deviceAuth) {
      chrome.tabs.create({ url: this.state.deviceAuth.verificationUri });
    }
  }
  private handleCopyCode = async () => {
    if (this.state.deviceAuth) {
      try {
        await navigator.clipboard.writeText(this.state.deviceAuth.userCode);
        message.success('Code copied');
      } catch (err) {
        message.error('Failed to copy the code');
      }
    }
  }
  private handleSignOut = async () => {
    this.setState({ authLoading: true });
    try {
      await github.signOut();
      this.setState({ token: '', login: '' });
    } finally {
      this.setState({ authLoading: false });
    }
  }
  private handleImport = async () => {
    let imported: any;
    try {
      imported = JSON.parse(atob(this.state.importValue));
    } catch (err) {
      message.error('Fail to import: Invalid data');
      return;
    }
    this.setState({
      password: imported.password,
      gistId: imported.gistId,
      filename: imported.filename,
    });
    message.success('Imported! Click "Set" to finish setting');
    this.handleImportClose();
  }
  private handleImportClose = () => {
    this.setState({ importModal: false });
  }
  private handleImportOpen = () => {
    this.setState({ importModal: true });
  }
  private handleImportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({
      importValue: e.currentTarget.value,
    });
  }
  private handleExport = async () => {
    if (this.state.password &&
      this.state.gistId &&
      this.state.filename
    ) {
      const base64 = btoa(JSON.stringify({
        password: this.state.password,
        gistId: this.state.gistId,
        filename: this.state.filename,
      }));
      const nav = navigator as any;
      await nav.clipboard.writeText(base64);
      message.success('Exported to your clipboard!');
    }
  }
  private handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const target = event.currentTarget;
    const value = target.value as any;
    const name = target.name;
    this.setState({
      [name]: value,
    } as Pick<State, keyof State>);
  }
  private handleClick = async () => {
    if (!this.state.token) {
      message.error('Sign in with GitHub first');
      return;
    }
    this.setState({
      loading: true,
    });
    const kevastGist = new KevastGist(this.state.token, this.state.gistId, this.state.filename);
    try {
      await kevastGist.init();
    } catch (err) {
      this.setState({ loading: false });
      Modal.error({
        title: 'Fail',
        // @ts-ignore
        content: err.message,
      });
      return;
    }
    await new Promise<void>((resolve) => chrome.storage.local.clear(resolve));
    const gistId = await kevastGist.getGistId();
    const filename = await kevastGist.getFilename();
    await setting.set({
      token: this.state.token,
      password: this.state.password,
      gistId,
      filename,
    });
    this.setState({ gistId, filename });
    this.props.onSet();
  }
}

export default Setting;
