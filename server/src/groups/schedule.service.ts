import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

@Injectable()
export class ScheduleService {
  async parseSchedule(url: string) {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    try {
      await page.goto(url, { waitUntil: 'networkidle2' }); 
      
      const content = await page.content();
      const $ = cheerio.load(content);
      const scheduleData: { rawText: string }[] = [];
      $('div[class*="sc-"]').each((i, el) => {
          const text = $(el).text();
          if (text.includes('Лекція') || text.includes('Практика') || text.includes('Лабораторна')) {
             scheduleData.push({ rawText: text });
          }
      });

      return scheduleData;
    } catch (e) {
      console.error(e);
      return null;
    } finally {
      await browser.close();
    }
  }
}