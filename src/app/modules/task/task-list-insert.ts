import { Component, viewChild } from '@angular/core';
import { TextInputComponent } from '../../shared/form/text/text-input';
import { Profile } from '../profile/profile';
import { ListInsertComponent } from '../shared/list-insert';
import { Task } from './task';

@Component({
    selector: 'app-task-list-insert',
    template: `
        <app-text-input #title (onBlur)="submit()"/>
    `,
    imports: [TextInputComponent],
})
export class TaskListInsertComponent extends ListInsertComponent<'task'> {

    private readonly titleView = viewChild.required<TextInputComponent>('title');

    protected override getRowInfo(profile: Profile.Row) {
        const title = this.titleView().getValue();
        if (!title) return;
        return <Task.Insert>{ title, unit: profile.unit };
    }

}