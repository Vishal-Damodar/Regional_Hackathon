# filename: crawler_spider.py
import scrapy
import re
import warnings
import json

class IredaCrawlerSpider(scrapy.Spider):
    name = 'ireda_crawler_spider'
    
    # Allow passing start_url via command line arguments
    def __init__(self, start_url=None, *args, **kwargs):
        super(IredaCrawlerSpider, self).__init__(*args, **kwargs)
        if start_url:
            self.start_urls = [start_url]
        else:
            self.start_urls = ['https://ireda.in/cpsu-scheme']

    pdf_xpath = '//a[contains(@href, ".pdf")] | //*[contains(@onclick, "open_doc")]'
    url_pattern_onclick = re.compile(r"open_doc\('([^']+)'\)")

    custom_settings = {
        'DEPTH_PRIORITY': 1,
        'SCHEDULER_DISK_QUEUE': 'scrapy.squeues.PickleFifoDiskQueue',
        'SCHEDULER_MEMORY_QUEUE': 'scrapy.squeues.FifoMemoryQueue',
        'DEPTH_LIMIT': 2,                 
        'CLOSESPIDER_PAGECOUNT': 5,      
        'USER_AGENT': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
        'DOWNLOAD_HANDLERS': {
            'https': 'scrapy.core.downloader.handlers.http.HTTPDownloadHandler',
            'http': 'scrapy.core.downloader.handlers.http.HTTPDownloadHandler',
        },
        'DOWNLOAD_TIMEOUT': 15,
        'ROBOTSTXT_OBEY': False,
        'LOG_LEVEL': 'INFO',
        'FEED_FORMAT': 'json',
        'FEED_URI': 'crawled_output.json', # Output file
        'FEED_OVERWRITE': True # Overwrite previous results
    }

    def start_requests(self):
        with warnings.catch_warnings():
            warnings.filterwarnings('ignore', message="Unverified HTTPS request")
            for url in self.start_urls:
                yield scrapy.Request(url=url, callback=self.parse)

    def parse(self, response):
        self.logger.info(f"Scanning URL: {response.url}")
        
        # 1. Extract PDFs
        pdf_elements = response.xpath(self.pdf_xpath)
        for element in pdf_elements:
            pdf_url = None
            onclick_content = element.xpath('@onclick').get()
            
            if onclick_content:
                match = self.url_pattern_onclick.search(onclick_content)
                if match:
                    pdf_url = response.urljoin(match.group(1))
            
            if not pdf_url:
                href_content = element.xpath('@href').get()
                if href_content and href_content.lower().endswith('.pdf'):
                    pdf_url = response.urljoin(href_content)
            
            if pdf_url:
                yield {
                    'source_url': response.url, # <--- We need this for the API
                    'pdf_link': pdf_url
                }

        # 2. Follow Links
        all_links = response.xpath('//a/@href').getall()
        for href in all_links:
            full_url = response.urljoin(href)
            # Basic domain restriction to prevent leaving the site
            if full_url.startswith("https://ireda.in/") or full_url.startswith("http://ireda.in/"):
                yield response.follow(full_url, callback=self.parse)