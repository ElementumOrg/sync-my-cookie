import React, { Component } from 'react';
import './setting.scss';
const style = require('./setting.module.scss');

import { Modal } from 'antd';
import { Button, Collapse, Icon, Input, message, Popover, Radio, Spin, Tooltip } from 'antd';

import { Kevast } from 'kevast';
import { KevastEncrypt } from 'kevast-encrypt';
import * as github from '../../utils/github-auth';
import {
  DEFAULT_FILENAME,
  GistCandidate,
  KevastGist,
  listGistCandidates,
} from '../../utils/kevast-gist';
import * as keys from '../../utils/keys';
import { setting } from '../../utils/store';

interface Prop {
  onSet: () => void;
}

interface DomainInfo {
  domain: string;
  cookieCount: number;
  lastSynced?: string;
  cookies: Array<{name: string, expirationDate?: number}>;
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
  gistModal: boolean;
  gists: GistCandidate[];
  gistsLoading: boolean;
  selectedGistId?: string;
  domains: DomainInfo[];
  domainsLoading: boolean;
  domainsError: string;
  importModal: boolean;
  importValue: string;
}

class Setting extends Component<Prop, State> {
  private pendingSet = false;
  public constructor(props: Prop) {
    super(props);
    this.state = {
      token: '',
      login: '',
      password: '',
      loading: false,
      authLoading: false,
      gistModal: false,
      gists: [],
      gistsLoading: false,
      domains: [],
      domainsLoading: false,
      domainsError: '',
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
          <div>
            {!this.state.authLoading && (
              <p className={style.hint}>
                Sign in with GitHub to let SyncMyCookie access your private Gists.
                Only the <b>gist</b> scope is requested.
              </p>
            )}
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
          </div>
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
        <Tooltip
          title={
            'Encryption key for your cookie data. Use the same key on every browser. ' +
            'This is not your GitHub password.'
          }
          placement='topLeft'
        >
          <Input
            name='password'
            placeholder='Encryption key'
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
            <Button
              size='small'
              icon='search'
              block={true}
              className={style.input}
              onClick={this.handleBrowseGists}
              loading={this.state.gistsLoading}
            >
              Browse existing Gists
            </Button>
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
          disabled={!this.state.token || !this.state.password || this.state.gistsLoading}
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
        <div className={style.domains}>
          <div className={style.domainsHeader}>
            <span>Synced domains</span>
            <Button
              size='small'
              icon='reload'
              loading={this.state.domainsLoading}
              onClick={this.handleRefreshDomains}
            >
              Refresh
            </Button>
          </div>
          {this.state.domainsError && this.state.token && this.state.gistId && (
            <div className={style.domainsError}>{this.state.domainsError}</div>
          )}
          {!this.state.token ? (
            <div className={style.domainsEmpty}>Sign in with GitHub to see synced domains.</div>
          ) : !this.state.gistId ? (
            <div className={style.domainsEmpty}>Select a Gist to see synced domains.</div>
          ) : !this.state.password ? (
            <div className={style.domainsEmpty}>Enter the encryption key and click Refresh.</div>
          ) : this.state.domainsLoading ? (
            <div className={style.center}><Spin /></div>
          ) : this.state.domainsError ? null : this.state.domains.length === 0 ? (
            <div className={style.domainsEmpty}>No domains in this Gist yet.</div>
          ) : (
            <div className={style.domainsList}>
              {this.state.domains.map((item) => (
                <Popover
                  key={item.domain}
                  placement='left'
                  overlayClassName={style.cookiePopover}
                  title={item.domain}
                  content={this.renderCookieList(item)}
                >
                  <div className={style.domainRow}>
                    <span className={style.domainName}>{item.domain}</span>
                    <span className={style.domainCount}>
                      {item.cookieCount} {item.cookieCount === 1 ? 'cookie' : 'cookies'}
                    </span>
                    <span className={style.domainDate}>{this.formatDate(item.lastSynced)}</span>
                  </div>
                </Popover>
              ))}
            </div>
          )}
        </div>
        <Modal
          title='Select an existing Gist'
          visible={this.state.gistModal}
          onOk={this.handleSelectGist}
          onCancel={this.handleGistModalClose}
          okText='Use this Gist'
          okButtonProps={{disabled: !this.state.selectedGistId || this.state.gistsLoading}}
        >
          {this.state.gistsLoading ? (
            <div className={style.center}><Spin /></div>
          ) : this.state.gists.length === 0 ? (
            <p>No existing SyncMyCookie Gists found. Click Set to create a new one.</p>
          ) : (
            <Radio.Group
              className={style.gistList}
              value={this.state.selectedGistId}
              onChange={this.handleGistSelectChange}
            >
              {this.state.gists.map((gist) => (
                <Radio
                  key={gist.id}
                  value={gist.id}
                  className={[style.gistItem, this.state.selectedGistId === gist.id && style.gistItemActive]
                    .filter(Boolean).join(' ')}
                >
                  <div className={style.gistTitle}>{gist.id}</div>
                  <div className={style.gistMeta}>
                    {gist.domains.length} {gist.domains.length === 1 ? 'domain' : 'domains'}
                    {' '}&middot; updated {this.formatDate(gist.updatedAt)}
                  </div>
                  {gist.domains.length > 0 && (
                    <div className={style.gistDomains}>{gist.domains.join(', ')}</div>
                  )}
                </Radio>
              ))}
            </Radio.Group>
          )}
        </Modal>
      </div>
    );
  }
  public async componentDidMount() {
    const token = await setting.get('token') || '';
    const password = await setting.get('password') || '';
    const gistId = await setting.get('gistId') || '';
    const filename = await setting.get('filename') || '';
    this.setState({ token, password, gistId, filename }, () => {
      if (token) {
        this.setState({ authLoading: true });
        this.loadUser(token);
      }
      if (token && password && gistId) {
        this.loadDomains();
      }
    });
  }
  private async loadUser(token: string) {
    try {
      const user = await github.getUser(token);
      this.setState({ login: user.login });
    } catch (err) {
      if ((err as any).status === 401) {
        await github.signOut();
        this.setState({ token: '', login: '', domains: [], domainsError: '' });
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
      this.setState({ token, login: user.login, deviceAuth: undefined, domains: [], domainsError: '' });
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
      this.setState({ token: '', login: '', domains: [], domainsError: '' });
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
    }, () => {
      if (this.state.token && this.state.password && this.state.gistId) {
        this.loadDomains();
      }
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
    if (!this.state.gistId) {
      await this.openGistSelector(true);
      return;
    }
    await this.finishSet();
  }
  private finishSet = async () => {
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
    this.setState({ gistId, filename, loading: false }, () => {
      this.loadDomains();
    });
    this.props.onSet();
  }
  private openGistSelector = async (forSet: boolean) => {
    if (!this.state.token) {
      message.error('Sign in with GitHub first');
      return;
    }
    this.pendingSet = forSet;
    this.setState({
      gistModal: true,
      gistsLoading: true,
      gists: [],
      selectedGistId: this.state.gistId || undefined,
    });
    try {
      const gists = await listGistCandidates(this.state.token);
      if (forSet && gists.length === 0) {
        this.pendingSet = false;
        this.setState({ gistModal: false, gistsLoading: false });
        await this.finishSet();
        return;
      }
      this.setState({ gists, gistsLoading: false });
    } catch (err) {
      this.pendingSet = false;
      this.setState({ gistModal: false, gistsLoading: false });
      message.error((err as Error).message || 'Failed to list Gists');
    }
  }
  private handleBrowseGists = () => {
    this.openGistSelector(false);
  }
  private handleGistModalClose = () => {
    this.pendingSet = false;
    this.setState({ gistModal: false });
  }
  private handleSelectGist = () => {
    if (!this.state.selectedGistId) {
      message.error('Select a Gist first');
      return;
    }
    const pending = this.pendingSet;
    this.pendingSet = false;
    this.setState({
      gistId: this.state.selectedGistId,
      filename: DEFAULT_FILENAME,
      gistModal: false,
    }, () => {
      if (pending) {
        this.finishSet();
      } else {
        this.loadDomains();
      }
    });
  }
  private handleGistSelectChange = (event: any) => {
    this.setState({ selectedGistId: event.target.value });
  }
  private handleRefreshDomains = () => {
    this.loadDomains();
  }
  private async loadDomains() {
    const {token, password, gistId} = this.state;
    if (!token || !password || !gistId) {
      this.setState({ domains: [], domainsError: '' });
      return;
    }
    this.setState({ domainsLoading: true, domainsError: '' });
    try {
      const store = new Kevast();
      const gistStorage = new KevastGist(token, gistId, this.state.filename || DEFAULT_FILENAME);
      store.add(gistStorage);
      store.use(new KevastEncrypt(password));
      const domainList = JSON.parse(await store.get(keys.DOMAIN_LIST_KEY) || '[]') as string[];
      const meta = JSON.parse(await store.get(keys.DOMAIN_META_KEY) || '{}') as {[domain: string]: string};
      const updatedAt = gistStorage.getUpdatedAt();
      const domains: DomainInfo[] = [];
      for (const domain of domainList) {
        const parsed = JSON.parse(await store.get(domain) || '[]');
        const cookies = (Array.isArray(parsed) ? parsed : [])
          .map((cookie: any) => ({
            name: cookie.name as string,
            expirationDate: cookie.expirationDate as number | undefined,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        domains.push({
          domain,
          cookieCount: cookies.length,
          lastSynced: meta[domain] || updatedAt,
          cookies,
        });
      }
      domains.sort((a, b) => a.domain.localeCompare(b.domain));
      this.setState({ domains, domainsLoading: false });
    } catch (err) {
      this.setState({
        domains: [],
        domainsLoading: false,
        domainsError: 'Failed to read the Gist. Check the encryption key and the selected Gist.',
      });
    }
  }
  private renderCookieList(item: DomainInfo) {
    return (
      <div className={style.cookieList}>
        {item.cookies.length === 0 ? (
          <div className={style.cookieEmpty}>No cookies</div>
        ) : (
          item.cookies.map((cookie, index) => (
            <div key={`${cookie.name}-${index}`} className={style.cookieRow}>
              <span className={style.cookieName}>{cookie.name}</span>
              <span className={style.cookieExpiry}>
                {this.formatExpiration(cookie.expirationDate)}
              </span>
            </div>
          ))
        )}
      </div>
    );
  }
  private formatDate(value?: string): string {
    if (!value) {
      return 'Unknown';
    }
    const date = new Date(value);
    return isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString();
  }
  private formatExpiration(expirationDate?: number): string {
    if (!expirationDate) {
      return 'Session';
    }
    const date = new Date(expirationDate * 1000);
    return isNaN(date.getTime()) ? 'Session' : date.toLocaleString();
  }
}

export default Setting;
