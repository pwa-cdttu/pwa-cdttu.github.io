import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { AfterViewChecked, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { AdmissionsOfficeService } from 'src/app/shared/service/admissions-office/admissions-office.service';
import { ViewMissionService } from 'src/app/shared/service/view-mission/view-mission.service';

@Component({
  selector: 'app-phong-tuyen-sinh',
  templateUrl: './phong-tuyen-sinh.component.html',
  styleUrls: ['./phong-tuyen-sinh.component.scss']
})
export class PhongTuyenSinhComponent implements OnInit {
  menu = [
    {
      key: 'diem-danh',
      url: 'diem-danh',
      icon: 'receipt_long',
      label: 'Điểm danh',
      toolTip: 'Điểm danh',
    }
  ]
  viewPortMode: any;
  addmissionWorkbook: any;;

  constructor(
    public viewMissionService: ViewMissionService,
    private breakpointObserver: BreakpointObserver,
    public admissionsOfficeService: AdmissionsOfficeService
  ) {
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
    this.fetchAddmissionData();
  }

  onToggleDrawer() {
    if (this.viewPortMode == 'mobile') {
      this.viewMissionService.isDrawerOpened =
        !this.viewMissionService.isDrawerOpened;
      localStorage.setItem('layout', JSON.stringify({ isDrawerOpened: this.viewMissionService.isDrawerOpened }))
    }
  }

  fetchAddmissionData() {
    this.admissionsOfficeService.fetchAddmissionData().subscribe({
      next: (res: any) => {
        this.addmissionWorkbook = res.data
      },
      error(err) {
          console.log(err);          
      },
      complete: () => {
        console.info('complete');
      }
    })
  }
}
