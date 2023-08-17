import { ApplicationRef, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ViewMissionService } from 'src/app/shared/service/view-mission/view-mission.service';
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { ActivatedRoute, Router } from '@angular/router';
import { SwUpdate, SwPush } from '@angular/service-worker';
import { interval } from 'rxjs';

@Component({
  selector: 'app-full-layout',
  templateUrl: './full-layout.component.html',
  styleUrls: ['./full-layout.component.scss']
})
export class FullLayoutComponent implements OnInit {
  mainMenu = [
    {
      key: 'phong-tuyen-sinh',
      toolTip: 'Phòng tuyển sinh',
      icon: 'support_agent',
      url: 'phong-tuyen-sinh'
    }
  ]
  currentLayout: any;
  isHideToolbar: boolean = false;
  isHideBottomNavBar: boolean = false;
  viewPortMode: any;

  constructor(
    public viewMissionService: ViewMissionService,
    private cd: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router,
    private swUpdate: SwUpdate,
    private swPush: SwPush,
    private appRef: ApplicationRef,
    private breakpointObserver: BreakpointObserver
  ) {
    router.events.subscribe((val: any) => {
      localStorage.setItem(
        'layout',
        JSON.stringify({
          isHideToolbar: false,
          isHideBottomNavBar: false,
        })
      );
    });
  }

  ngAfterViewChecked(): void {
    this.currentLayout = JSON.parse(<string>localStorage.getItem('layout'))
    this.isHideToolbar = this.currentLayout?.isHideToolbar;
    this.isHideBottomNavBar = this.currentLayout?.isHideBottomNavBar;
    this.cd.detectChanges();
  }

  ngOnInit(): void {
    this.breakpointObserver
      .observe(['(max-width: 600px)'])
      .subscribe((state: BreakpointState) => {
        const localStorageIsDrawerOpened = JSON.parse(localStorage.getItem('layout') || '{}')
        if (state.matches) {
          this.viewPortMode = 'mobile';
          this.viewMissionService.isDrawerOpened = false;
        } else {
          this.viewPortMode = 'desktop';
          if (localStorageIsDrawerOpened.isDrawerOpened !== undefined) {
            this.viewMissionService.isDrawerOpened = localStorageIsDrawerOpened.isDrawerOpened;
          } else {
            this.viewMissionService.isDrawerOpened = true;
            localStorage.setItem('layout', JSON.stringify({ isDrawerOpened: true }))
          }
        }
      });
    this.autoCheckForUpdate();
    this.onUpdateVersion();
  }

  onUpdateVersion() {
    if (!this.swUpdate.isEnabled) {
      console.log('Not enable to update');
      return;
    }
    this.swUpdate.available.subscribe((event: any) => {
      console.log(`current`, event.current, `available`, event.available);
      if (
        confirm(
          'Phiên bản mới đã sẵn sàng, hãy đồng ý để cập nhật phiên bản mới ngay!!'
        )
      ) {
        this.swUpdate.activateUpdate().then(() => location.reload());
      }
    });
    this.swUpdate.activated.subscribe((event: any) => {
      console.log(`current`, event.previous, `available`, event.current);
    });
  }

  autoCheckForUpdate() {
    this.appRef.isStable.subscribe((isStable: any) => {
      if (!isStable) {
        const timeInterval = interval(8 * 60 * 60 * 1000);
        // const timeInterval = interval(2000);
        timeInterval.subscribe(() => {
          this.swUpdate.checkForUpdate().then(() => {
            console.log('auto check for update');
            this.onUpdateVersion();
            location.reload();
          });
        });
      }
    });
  }

  onToggleDrawer() {
    this.viewMissionService.isDrawerOpened =
      !this.viewMissionService.isDrawerOpened;
    localStorage.setItem('layout', JSON.stringify({ isDrawerOpened: this.viewMissionService.isDrawerOpened }))
  }
}
