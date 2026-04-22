/**
 * Project Manager - 管理外部项目进程
 * 用于 Visual Editor 功能，启动、监控和停止用户的 React/Vite 项目
 */

import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';

class ProjectManager extends EventEmitter {
  constructor() {
    super();
    this.process = null;
    this.projectPath = null;
    this.port = null;
    this.status = 'stopped'; // stopped | starting | running | error
    this.outputBuffer = '';
    this.startTime = null;
  }

  /**
   * 启动项目
   * @param {string} projectPath - 项目路径
   * @param {string} command - 启动命令，默认 'npm run dev'
   * @param {object} options - 选项
   * @param {string|RegExp} options.readyPattern - 就绪检测模式
   * @param {number} options.timeout - 超时时间（毫秒）
   */
  async start(projectPath, command = 'npm run dev', options = {}) {
    if (this.process) {
      await this.stop();
    }

    this.projectPath = projectPath;
    this.status = 'starting';
    this.outputBuffer = '';
    this.port = null;
    this.startTime = Date.now();
    this.emit('status', this.getStatus());

    // 解析命令
    const [cmd, ...args] = command.split(' ');

    // 启动进程
    this.process = spawn(cmd, args, {
      cwd: projectPath,
      shell: true,
      env: {
        ...process.env,
        FORCE_COLOR: '1',
        // 防止某些工具询问是否安装依赖
        CI: 'true',
      },
    });

    // 就绪检测模式
    const readyPattern = options.readyPattern
      ? (typeof options.readyPattern === 'string' ? new RegExp(options.readyPattern, 'i') : options.readyPattern)
      : /ready|VITE v|localhost:(\d+)|Local:\s+http|compiled successfully|webpack compiled/i;

    const timeout = options.timeout || 60000;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.status = 'error';
        this.emit('status', this.getStatus());
        reject(new Error('Project start timeout'));
      }, timeout);

      const onData = (data) => {
        const text = data.toString();
        this.outputBuffer += text;

        // 限制缓冲区大小
        if (this.outputBuffer.length > 100000) {
          this.outputBuffer = this.outputBuffer.slice(-50000);
        }

        this.emit('output', text);

        // 检测端口
        const portMatch = text.match(/localhost:(\d+)|127\.0\.0\.1:(\d+)|Local:\s+http:\/\/[^:]+:(\d+)/);
        if (portMatch && !this.port) {
          this.port = parseInt(portMatch[1] || portMatch[2] || portMatch[3]);
        }

        // 检测就绪状态
        if (readyPattern.test(text)) {
          // 如果没有检测到端口，尝试常见端口
          if (!this.port) {
            // 检测是否有明确的端口信息
            const fallbackMatch = this.outputBuffer.match(/port\s+(\d+)|:(\d{4,5})/i);
            if (fallbackMatch) {
              this.port = parseInt(fallbackMatch[1] || fallbackMatch[2]);
            }
          }

          if (this.port) {
            clearTimeout(timer);
            this.status = 'running';
            this.emit('status', this.getStatus());
            resolve(this.getStatus());
          }
        }
      };

      this.process.stdout.on('data', onData);
      this.process.stderr.on('data', onData);

      this.process.on('error', (err) => {
        clearTimeout(timer);
        this.status = 'error';
        this.emit('status', this.getStatus());
        reject(err);
      });

      this.process.on('exit', (code) => {
        clearTimeout(timer);
        const wasRunning = this.status === 'running';
        this.status = 'stopped';
        this.process = null;
        this.emit('status', this.getStatus());
        this.emit('exit', code);

        // 如果在启动过程中退出，报告错误
        if (!wasRunning && code !== 0) {
          reject(new Error(`Process exited with code ${code}`));
        }
      });
    });
  }

  /**
   * 停止项目
   */
  async stop() {
    if (this.process) {
      // 先尝试优雅关闭
      this.process.kill('SIGTERM');

      // 等待进程退出
      await new Promise((resolve) => {
        const timer = setTimeout(() => {
          // 强制杀死
          if (this.process) {
            this.process.kill('SIGKILL');
          }
          resolve();
        }, 3000);

        if (this.process) {
          this.process.once('exit', () => {
            clearTimeout(timer);
            resolve();
          });
        } else {
          clearTimeout(timer);
          resolve();
        }
      });

      this.process = null;
    }

    this.status = 'stopped';
    this.port = null;
    this.emit('status', this.getStatus());
  }

  /**
   * 获取当前状态
   */
  getStatus() {
    return {
      running: this.status === 'running',
      status: this.status,
      pid: this.process?.pid || null,
      port: this.port,
      projectPath: this.projectPath,
      uptime: this.startTime && this.status === 'running'
        ? Math.floor((Date.now() - this.startTime) / 1000)
        : 0,
    };
  }

  /**
   * 获取输出缓冲区
   */
  getOutputBuffer() {
    return this.outputBuffer;
  }
}

// 导出单例
export const projectManager = new ProjectManager();
export default projectManager;
